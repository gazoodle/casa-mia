// Casa Mia: reload a dashboard when it changes. Listens on HA's websocket for
// lovelace_updated and reloads the page when the dashboard being shown was changed (the
// home dashboard too), but not while it is being edited. Wall tablets pick up a deployed
// dashboard this way. Loaded by the Casa Mia integration (switched on on the Casa Mia panel's Settings page).
// Brought in from auto_refresh.js 0.0.5, unchanged but for this note and the banner.

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

window.hassConnection.then(t => t.conn.socket.addEventListener("message", autoReloadHandler));
  
console.info(
  `%cCASA-MIA REFRESH\n%cauto-refresh 0.0.5`,
  "color: green; font-weight: bold;",
  ""
);