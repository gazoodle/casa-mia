// Casa Mia: reload a dashboard when it changes. Listens on HA's websocket for
// lovelace_updated and reloads the page when the dashboard being shown was changed (the
// home dashboard too), but not while it is being edited. Wall tablets pick up a deployed
// dashboard this way. Loaded by the Casa Mia integration (switched on on the Casa Mia panel's Settings page).
// Brought in from auto_refresh.js 0.0.5.

function canReload() {
  // Dedide if we're in edit mode and ignore any events
  const ha = document.querySelector("home-assistant");
  if (!ha || !ha.shadowRoot) {
    // console.log("Can't find home-assistant node")
    return false;
  }
  const ham = ha.shadowRoot.querySelector("home-assistant-main");
  if (!ham || !ham.shadowRoot) {
    // console.log("Can't find home-assistant-main shadow root node")
    return false;
  }
  const had = ham.shadowRoot.querySelector("ha-drawer");
  if (!had || !had.shadowRoot) {
    // console.log("Can't find ha-drawer shadow root node")
    return false;
  }
  const hpl = ham.shadowRoot.querySelector("ha-panel-lovelace");
  if (!hpl || !hpl.shadowRoot) {
    // console.log("Can't find ha-panel-lovelace shadow root node")
    return false;
  }
  const huiroot = hpl.shadowRoot.querySelector("hui-root");
  if (!huiroot || !huiroot.shadowRoot) {
    // console.log("Can't find hui-root shadow root node")
    return false;
  }
  const editMode = huiroot.shadowRoot.querySelector("div.edit-mode");
  if (editMode !== null) {
    // console.log("In edit mode so don't reload here!")
    return false;
  }

  return true;
}

function autoReloadHandler(e) {

  let evt = JSON.parse(e.data);
  if (!Array.isArray(evt)) {
    evt = new Array(evt);
  }

  // Handle update, including lovelace home page
  evt.forEach(e => {
    if (e.type === 'event' && e.event.event_type === 'lovelace_updated') {
      if (document.location.pathname.startsWith('/' + e.event.data.url_path) || ((document.location.pathname === '/lovelace/home') && ( e.event.data.url_path === null ))) {
        if (canReload()) {
          setTimeout(() => document.location.reload(), 500);
        }
      }                 
    }           
  });   
}

// HA imports its core and these scripts separately, so the connection may not exist yet, and
// nothing announces it: look until it's there (owner's approval of this start-up retry,
// 2026-11-02), or say this won't work and give up. As cards/src/connection.ts does; this file
// loads apart from that bundle.
function whenConnected(use) {
  const failed = why => console.error(`CASA-MIA REFRESH: dashboards won't reload when they change: ${why}`);
  const attach = () => {
    window.hassConnection?.then(use, code => failed(`Home Assistant's connection failed (${code})`));
    return !!window.hassConnection;
  };
  if (attach()) return;

  let left = 600; // about a minute, for a slow tablet on a cold load
  const timer = setInterval(() => {
    if (attach()) clearInterval(timer);
    else if (--left === 0) {
      clearInterval(timer);
      failed("Home Assistant's connection never appeared");
    }
  }, 100);
}

whenConnected(t => t.conn.socket.addEventListener("message", autoReloadHandler));


console.info(
  `%cCASA-MIA REFRESH\n%cauto-refresh 0.0.5`,
  "color: green; font-weight: bold;",
  ""
);