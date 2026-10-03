"""The welcome page a visitor sees while being signed in: the house photo fading into the
page and a card with the title and message, in the admin panel's colours (light or dark
by the phone's setting). Also rendered as a preview for the admin page."""

from __future__ import annotations

import html
import json

from .. import header

PAGE = """<!doctype html><html lang="en"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<meta name="theme-color" content="#07170f"><title>@TITLE@</title>
<style>
:root{--bg:#07170f;--surface:#0f2419;--border:#21402f;--text:#eef5ef;--muted:#9db3a4;
--accent:#7bd1a0;--sun:#fbbf24;--bad:#ff7a6b;color-scheme:dark}
@media (prefers-color-scheme:light){:root{--bg:#f4f6f1;--surface:#fff;--border:#d9e3da;
--text:#13241a;--muted:#5d7064;--accent:#1f7a4d;--bad:#c2412d;color-scheme:light}}
*{box-sizing:border-box}
html,body{margin:0;min-height:100%;background:var(--bg);color:var(--text);
font:16px/1.45 system-ui,-apple-system,"Segoe UI",sans-serif;-webkit-font-smoothing:antialiased}
.hero{position:relative;overflow:hidden;height:max(240px,52vh);background:var(--surface);
-webkit-mask-image:linear-gradient(#000 50%,transparent);mask-image:linear-gradient(#000 50%,transparent)}
.hero div{position:absolute;inset:0;background:@IMG@ @X@% @Y@%/cover no-repeat;
transform:scale(@ZOOM@);transform-origin:@X@% @Y@%}
main{position:relative;max-width:420px;margin:-96px auto 0;padding:0 20px 40px;text-align:center}
.card{padding:26px 22px 24px;border:1px solid var(--border);border-radius:22px;
background:color-mix(in srgb,var(--surface) 86%,transparent);-webkit-backdrop-filter:blur(12px);
backdrop-filter:blur(12px);box-shadow:0 20px 50px rgb(0 0 0/.35)}
h1{margin:0 0 6px;font-size:clamp(24px,7vw,30px);font-weight:650;letter-spacing:.01em}
p{margin:0;color:var(--muted)}
.dots{display:flex;gap:7px;justify-content:center;margin-top:20px}
.dots span{width:9px;height:9px;border-radius:50%;background:var(--accent);animation:b 1.2s infinite ease-in-out}
.dots span:nth-child(2){animation-delay:.15s}.dots span:nth-child(3){animation-delay:.3s}
@keyframes b{0%,80%,100%{opacity:.25;transform:scale(.7)}40%{opacity:1;transform:none}}
.done .dots{display:none}.bad h1{color:var(--bad)}
.brand{margin-top:22px;color:var(--muted);font-size:12px;letter-spacing:.16em;text-transform:uppercase}
.preview{position:fixed;top:10px;left:50%;z-index:1;transform:translateX(-50%);padding:4px 12px;
border-radius:999px;background:var(--sun);color:#1a1300;font-size:12px;font-weight:700}
@media (prefers-reduced-motion:reduce){.dots span{animation:none;opacity:.7}}
</style></head>
<body><div class="hero"><div></div></div>
<main><div class="card" id="card"><h1 id="h">@TITLE@</h1><p id="p">@MESSAGE@</p>
<div class="dots" aria-hidden="true"><span></span><span></span><span></span></div></div>
<div class="brand">@HOUSE@</div></main>
<script>
const card=document.getElementById("card"),h_=document.getElementById("h"),p_=document.getElementById("p");
const say=(h,p,bad)=>{h_.textContent=h;p_.textContent=p;card.className="card done"+(bad?" bad":"")};
const t0=Date.now(),delay=@DELAY@,preview=@PREVIEW@;
if(preview){document.body.insertAdjacentHTML("afterbegin",'<div class="preview">Preview</div>');
 setTimeout(()=>say(h_.textContent,"Here the visitor is taken to their dashboard."),delay);}
else fetch(location.pathname.replace(/\\/$/,"")+"/go"+location.search,{method:"POST"})
 .then(r=>r.json().then(j=>({ok:r.ok,j})))
 .then(({ok,j})=>{if(ok){setTimeout(()=>{location.href=j.url},Math.max(0,delay-(Date.now()-t0)))}
  else if(j.error==="ha_unreachable")say("One moment","The house system is not answering. Please try again shortly.",true);
  else if(j.error==="rate_limited")say("Too many tries","Please wait a minute and scan again.",true);
  else say("Sorry","We could not sign you in. Please ask your host.",true)})
 .catch(()=>say("Sorry","We could not reach the house. Are you on the guest Wi-Fi?",true));
</script></body></html>"""


def render_welcome(
    title: str,
    message: str,
    delay: int,
    image_url: str | None,
    preview: bool = False,
    frame: dict[str, float] | None = None,
) -> str:
    """The page, with `delay` seconds (clamped 0-30) and the house photo at `image_url`,
    framed as saved on the admin page (or as `frame`, for an unsaved preview)."""
    image = f"url({json.dumps(image_url)})" if image_url and header_jpeg() else ""
    frame = header.framing()["welcome"] if frame is None else frame
    return (
        PAGE.replace("@TITLE@", html.escape(title))
        .replace("@MESSAGE@", html.escape(message))
        .replace("@HOUSE@", html.escape(header.HOUSE))
        .replace("@DELAY@", str(max(0, min(int(delay), 30)) * 1000))
        .replace("@PREVIEW@", "true" if preview else "false")
        .replace("@IMG@", image)
        .replace("@X@", f"{frame['x']:g}")
        .replace("@Y@", f"{frame['y']:g}")
        .replace("@ZOOM@", f"{frame['zoom']:g}")
    )


def header_jpeg() -> bytes | None:
    """The house photo, made smaller for phones. None if there is none."""
    return header.phone_jpeg()
