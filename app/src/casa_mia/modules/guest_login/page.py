"""The welcome page a visitor sees while being signed in: the house photo fading into the
page and a card with the title and message, in the admin panel's colours (light or dark
by the phone's setting). Also rendered as a preview for the admin page.

An engineer's page has no photo. With house info on, the house rules show under the card and the sign-in waits for Continue. When the login has two-factor sign-in, the
card asks for the code and passes it on."""

from __future__ import annotations

import html
import json

from ... import header

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
.info{margin-top:16px;padding:18px 20px;border:1px solid var(--border);border-radius:18px;
background:var(--surface);text-align:left}
.info h2{margin:0 0 10px;font-size:15px;letter-spacing:.04em;text-transform:uppercase;color:var(--muted)}
.info p{color:var(--text);margin:8px 0 0}
button{font:inherit;font-weight:650;margin-top:18px;padding:11px 26px;border:0;border-radius:999px;
background:var(--accent);color:var(--bg);cursor:pointer}
form{margin-top:16px}form input{font:600 24px/1 ui-monospace,monospace;letter-spacing:.3em;width:100%;
max-width:220px;padding:10px;text-align:center;border:1px solid var(--border);border-radius:12px;
background:var(--bg);color:var(--text)}
form button{display:block;margin:14px auto 0}
.hero:empty{display:none}.hero:empty+main{margin-top:12vh}
.preview{position:fixed;top:10px;left:50%;z-index:1;transform:translateX(-50%);padding:4px 12px;
border-radius:999px;background:var(--sun);color:#1a1300;font-size:12px;font-weight:700}
@media (prefers-reduced-motion:reduce){.dots span{animation:none;opacity:.7}}
</style></head>
<body><div class="hero">@HERO@</div>
<main><div class="card" id="card"><h1 id="h">@TITLE@</h1><p id="p">@MESSAGE@</p>
<div class="dots" aria-hidden="true"><span></span><span></span><span></span></div>
<button id="go" hidden>Continue</button>
<form id="mfa" hidden><input id="code" inputmode="numeric" autocomplete="one-time-code"
maxlength="8" aria-label="Code"><button>Sign in</button></form></div>
@INFO@<div class="brand">@HOUSE@</div></main>
<script>
const $=(id)=>document.getElementById(id),card=$("card"),h_=$("h"),p_=$("p"),mfa=$("mfa"),code=$("code"),cont=$("go");
const say=(h,p,bad)=>{h_.textContent=h;p_.textContent=p;card.className="card done"+(bad?" bad":"")};
const delay=@DELAY@,preview=@PREVIEW@,info=@INFO_ON@,wait=info?0:delay;
const url=location.pathname.replace(/\\/$/,"")+"/go"+location.search;
let t0=Date.now(),pending=null;
const ask=(text)=>{say("One more step",text);mfa.hidden=false;code.value="";code.focus()};
const fail=(e)=>{
 if(e==="ha_unreachable")say("One moment","The house system is not answering. Please try again shortly.",true);
 else if(e==="rate_limited")say("Too many tries","Please wait a minute and scan again.",true);
 else if(e==="bad_code")ask("That code did not work. Type the newest one.");
 else if(e==="mfa_expired")say("Sorry","That took too long. Please scan the code again.",true);
 else say("Sorry","We could not sign you in. Please ask your host.",true)};
const send=(body)=>fetch(url,{method:"POST",body:body&&JSON.stringify(body)})
 .then(r=>r.json().then(j=>({ok:r.ok,j})))
 .then(({ok,j})=>{if(ok&&j.mfa){pending=j.mfa;ask("Type the code from the authenticator app. Your host can give it to you.")}
  else if(ok)setTimeout(()=>{location.href=j.url},Math.max(0,wait-(Date.now()-t0)));
  else fail(j.error)})
 .catch(()=>say("Sorry","We could not reach the house. Are you on the guest Wi-Fi?",true));
mfa.onsubmit=(e)=>{e.preventDefault();mfa.hidden=true;card.className="card";p_.textContent="Checking…";send({pending,code:code.value})};
const start=()=>{t0=Date.now();
 if(preview)setTimeout(()=>say(h_.textContent,"Here the visitor is taken to their dashboard."),wait);
 else send()};
if(preview)document.body.insertAdjacentHTML("afterbegin",'<div class="preview">Preview</div>');
if(info){card.className="card done";cont.hidden=false;p_.hidden=true;
 cont.onclick=()=>{cont.hidden=true;p_.hidden=false;card.className="card";start()}}
else start();
</script></body></html>"""


def render_info(info: dict[str, str] | None) -> str:
    """The house info card: the house rules, each blank-line-separated paragraph of them
    a paragraph. Empty when there are none."""
    text = str((info or {}).get("text") or "").strip()
    paras = "".join(
        "<p>" + html.escape(part.strip()).replace("\n", "<br>") + "</p>"
        for part in text.split("\n\n")
        if part.strip()
    )
    return f'<section class="info"><h2>The house</h2>{paras}</section>' if paras else ""


def render_welcome(
    title: str,
    message: str,
    delay: int,
    image_url: str | None,
    preview: bool = False,
    frame: dict[str, float] | None = None,
    info: dict[str, str] | None = None,
) -> str:
    """The page, with `delay` seconds (clamped 0-30) and the house photo at `image_url`
    (none: no photo), framed as saved on the admin page (or as `frame`, for an unsaved
    preview). With `info`, the house info shows and the sign-in waits for Continue."""
    image = f"url({json.dumps(image_url)})" if image_url and header_jpeg() else ""
    frame = header.framing()["welcome"] if frame is None else frame
    info_html = render_info(info) if info is not None else ""
    return (
        PAGE.replace("@HERO@", "<div></div>" if image else "")
        .replace("@INFO@", info_html)
        .replace("@INFO_ON@", "true" if info_html else "false")
        .replace("@TITLE@", html.escape(title))
        .replace("@MESSAGE@", html.escape(message))
        .replace("@HOUSE@", html.escape(header.HOUSE))
        .replace("@DELAY@", str(max(0, min(int(delay), 30)) * 1000))
        .replace("@PREVIEW@", "true" if preview else "false")
        .replace("@IMG@", image)
        .replace("@X@", f"{frame['x']:g}")
        .replace("@Y@", f"{frame['y']:g}")
        .replace("@ZOOM@", f"{frame['zoom']:g}")
    )


def render_goodbye(title: str, message: str, image_url: str | None) -> str:
    """The page a signed-out visitor's browser is sent to: the welcome page's look, with
    nothing running."""
    page = render_welcome(title, message, 0, image_url, info=None)
    page = page[: page.index("<script>")] + "</body></html>"
    return page.replace('class="card" id="card"', 'class="card done" id="card"')


def header_jpeg() -> bytes | None:
    """The house photo, made smaller for phones. None if there is none."""
    return header.phone_jpeg()
