"""Entry point: `python -m casa_mia`."""

from __future__ import annotations

import json
import logging
import os
import threading
from pathlib import Path

from . import app_version, header
from .components import ask_for_restart, install_bundled
from .ha import HA
from .install_count import count_install
from .log import configure_logging
from .modules.camera_dashboard import DRAFT_PORT, KEEP_STILLS_EVERY, CameraDashboard
from .modules.compositor import DRAFT_STORE, Compositor
from .modules.fona import EVENT as FONA_EVENT
from .modules.fona import Fona
from .modules.gitproxy import GitProxy
from .modules.guest_api import GuestAPI, load_store, remember, runtime
from .modules.guest_login import (
    EVENT,
    GuestLogin,
    fire_event,
    supervisor_ha_port,
    supervisor_lan_ip,
    supervisor_mdns_name,
)
from .modules.kiosks import Kiosks
from .modules.people import People
from .server import PORT, integration_url, make_server

# HA writes the app's options here; absent on the Mac, so defaults apply.
OPTIONS = Path("/data/options.json")
# The app's config folder (map addon_config): the module stores, backed up with the app.
CONFIG = Path("/config")
# Guest login's config store (logins, endpoints), edited on the admin page.
GUEST_STORE = CONFIG / "guest-login.json"
# The firmware server's settings (how many older releases to keep), set on the admin page.
GITPROXY_STORE = CONFIG / "gitproxy.json"
# Who may call or text the gate line (FONA), edited on the admin page.
PEOPLE_STORE = CONFIG / "people.json"
# The Kiosk Satellites: addresses added on the admin page and the app's login tokens.
KIOSKS_STORE = CONFIG / "kiosks.json"
# HA's media folder (map media): where QR codes are saved for dashboards to show.
MEDIA = Path("/media")


def banner(text: str) -> list[str]:
    """A box around the start line, so each restart stands out in the log."""
    rule = "━" * (len(text) + 4)
    return [f"┏{rule}┓", f"┃  {text}  ┃", f"┗{rule}┛"]


def main() -> int:
    options = json.loads(OPTIONS.read_text()) if OPTIONS.exists() else {}
    configure_logging(options.get("log_level", "info"))
    log = logging.getLogger("casa_mia")
    for line in banner(f"Casa Mia app {app_version()} starting"):
        log.info("%s", line)
    token = os.environ.get("SUPERVISOR_TOKEN", "")
    ask_for_restart(install_bundled(), token)
    if options.get("count_install", True):
        threading.Thread(
            target=count_install,
            args=(app_version(), OPTIONS.parent / "release"),
            daemon=True,
        ).start()
    else:
        log.info("install count: off")
    modules = {}
    actions = {}
    post_handlers = {}
    api = {}
    lan_ip = remember(lambda: supervisor_lan_ip(token))
    header.FOLDER = CONFIG
    header.HOUSE = options.get("house_name") or header.HOUSE
    log.info("house name: %s", header.HOUSE)
    api["/api/header/"] = header.handle  # the house photo, set on the home page
    # Under s6 SUPERVISOR_TOKEN reaches us only via run.sh (with-contenv).
    # CM_HA_URL/CM_HA_TOKEN point a dev run at a real HA instead of the Supervisor proxy.
    direct = os.environ.get("CM_HA_URL")
    ha_url = direct or "http://supervisor/core"
    ha_token = os.environ.get("CM_HA_TOKEN", "") if direct else token
    ws_path = "/api/websocket" if direct else "/websocket"
    ha = HA(ha_url.replace("http", "ws", 1) + ws_path, ha_token)
    # Always on: it is only a list, and FONA (and later guest login) look people up in it.
    people = People(PEOPLE_STORE, ha)
    modules["people"] = people.health
    api["/api/people/"] = people.handle
    # The alarm panel runs in the integration; the app only says whether it is switched on.
    alarm_on = options.get("alarm_enabled", False)
    log.info(
        "alarm panel: switched %s (it runs in the integration)",
        "on" if alarm_on else "off",
    )
    modules["alarm"] = lambda: {"state": "running" if alarm_on else "disabled"}
    if options.get("fona_enabled", False):
        fona = Fona(people.check, lambda event: fire_event(token, FONA_EVENT, event))
        fona.start()
        modules["fona"] = fona.health
        post_handlers["/fona/"] = fona.control
    else:
        modules["fona"] = lambda: {"state": "disabled"}
    if options.get("guest_login_enabled", False):
        store = load_store(GUEST_STORE)
        mdns = remember(lambda: supervisor_mdns_name(token))
        guest = GuestLogin(
            *runtime(store)[:3],
            state_path=OPTIONS.parent / "guest_login_state.json",
            ha_port=lambda: supervisor_ha_port(token),
            ha_hosts=lambda: [h for h in (lan_ip(), mdns()) if h],
            on_login=lambda ep, ip: fire_event(
                token, EVENT, {"endpoint": ep.id, "label": ep.label, "ip": ip}
            ),
        )
        guest.welcome = runtime(store)[3]
        guest.start()
        modules["guest_login"] = guest.health
        post_handlers["/guest-login/"] = guest.control
        api["/api/guest/"] = GuestAPI(
            guest,
            GUEST_STORE,
            store,
            ha,
            MEDIA,
            lan_host=lan_ip,
            mdns_name=mdns,
        ).handle
    else:
        modules["guest_login"] = lambda: {"state": "disabled"}
    gitproxy = None
    if options.get("gitproxy_enabled", False):
        gitproxy = GitProxy(
            OPTIONS.parent / "firmware", settings_path=GITPROXY_STORE, lan_host=lan_ip
        )
        gitproxy.start()
        modules["gitproxy"] = gitproxy.health
        actions["/gitproxy/check"] = gitproxy.mirror
        api["/api/gitproxy/"] = gitproxy.handle
    else:
        modules["gitproxy"] = lambda: {"state": "disabled"}
    proxies = {}
    helpers: set[str] = set()  # the integration's dashboard helpers (from /health)
    cameras_on = options.get("camera_dashboard_enabled", False)
    compositor = None
    if options.get("compositor_enabled", False):
        compositor = Compositor(
            CONFIG,
            ha_url,
            ha_token,
            ws_path=ws_path,
            needs="a Deploy live from the Camera Dashboard page"
            if cameras_on
            else "the Camera Dashboard option on",
        )
    if cameras_on:
        # The draft's compositor, for previews; only draws what someone looks at.
        draft = Compositor(
            CONFIG,
            ha_url,
            ha_token,
            port=DRAFT_PORT,
            ws_path=ws_path,
            store=DRAFT_STORE,
            prewarm=False,
            keep_stills=KEEP_STILLS_EVERY,
        )
        cameras = CameraDashboard(
            CONFIG,
            ha,
            lan_ip,
            live=compositor,
            draft=draft,
            state_path=OPTIONS.parent / "camera_dashboard_state.json",
            helpers=lambda: helpers,
        )
        cameras.start()
        draft.start()
        modules["camera_dashboard"] = cameras.health
        api["/api/camera-dashboard/"] = cameras.handle
        post_handlers["/camera-dashboard/"] = cameras.control  # the commander's select
    else:
        modules["camera_dashboard"] = lambda: {"state": "disabled"}
    if compositor:
        compositor.start()
        modules["compositor"] = compositor.health
    else:
        modules["compositor"] = lambda: {"state": "disabled"}
    if options.get("kiosks_enabled", False):
        firmware = gitproxy.health if gitproxy else dict
        kiosks = Kiosks(
            KIOSKS_STORE,
            OPTIONS.parent
            / "kiosks",  # their exports: in /data, so in the app's backups
            ha,
            latest=lambda: firmware().get("latest"),
            seeds=lambda: [ip for ip in [firmware().get("last_tablet")] if ip],
        )
        kiosks.start()
        modules["kiosks"] = kiosks.health
        api["/api/kiosks/"] = kiosks.handle
        proxies["/kiosk/"] = kiosks.proxy  # each kiosk's admin page, through ingress
    else:
        modules["kiosks"] = lambda: {"state": "disabled"}

    def is_off(health) -> bool:
        try:
            return health().get("state") == "disabled"
        except Exception:  # a log line must never stop the app
            return False

    states = {name: is_off(health) for name, health in modules.items()}
    log.info(
        "features on: %s; off: %s",
        ", ".join(n for n, off in states.items() if not off) or "none",
        ", ".join(n for n, off in states.items() if off) or "none",
    )
    log.info("serving /health on :%d", PORT)
    log.info(
        "Casa Mia integration URL (Settings > Devices & services > Casa Mia): %s",
        integration_url(),
    )
    try:
        make_server(
            modules=modules,
            actions=actions,
            post_handlers=post_handlers,
            api=api,
            proxies=proxies,
            helpers=helpers,
        ).serve_forever()
    except KeyboardInterrupt:
        pass
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
