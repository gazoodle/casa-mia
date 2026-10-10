// A guest's goodbye. When the guest-login endpoint a visitor came through closes and is set
// to sign its visitors out, the app waits a little before ending the session; in that time
// this sends the visitor's page to the goodbye page (or the address set for it), so they
// see a goodbye rather than Home Assistant's login screen. It reads the endpoint's Access
// switch, which every user can see: its attributes name the login's user. Runs on every
// page, for every user; does nothing for an administrator or a user no endpoint signs in as.
// A page asleep when the endpoint closes wakes to the login screen: HA's login page runs
// none of this.

const POLL_MS = 2000;
const seen = new Map<string, string>(); // each of this user's Access switches: last state

function look() {
  const hass = (document.querySelector("home-assistant") as any)?.hass;
  const me = hass?.user;
  if (!me || me.is_admin || !hass.states) return;
  const mine = Object.values<any>(hass.states).filter(
    (s) => s.entity_id.startsWith("switch.") && s.attributes?.guest_user_id === me.id,
  );
  if (!mine.length) return;
  const closed = mine.find((s) => s.attributes.signs_out && seen.get(s.entity_id) === "on" && s.state === "off");
  for (const s of mine) seen.set(s.entity_id, s.state);
  // Another open endpoint with the same login keeps the session (the app does the same).
  if (!closed || mine.some((s) => s.state === "on")) return;
  const a = closed.attributes;
  const url = a.goodbye_url || `http://${location.hostname}:${a.guest_port ?? 8675}/bye`;
  console.info(`CASA-MIA CARDS: ${closed.entity_id} closed; going to the goodbye page`);
  location.replace(url);
}

setInterval(look, POLL_MS);
