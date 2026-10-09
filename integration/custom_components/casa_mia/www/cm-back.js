// Casa Mia: the Back button. A dashboard button that navigates to "#BACK" means Back:
// the #BACK entry is dropped from history and the browser goes back. The camera
// dashboard's Back buttons rely on it. Loaded by the Casa Mia integration (switched on
// on the Casa Mia panel's Settings page). Brought in from nav_back_helper.js 0.0.2, unchanged but for this note and
// the banner.

window.hassConnection.then(() => {

  let goBackTwice = false;

  window.addEventListener("popstate", () => {
    // If the first back just occurred, do the second now
    if (goBackTwice) {
      goBackTwice = false;
      history.back();
    }
  });

  setInterval(() => {
    if (location.href.endsWith("#BACK")) {
      // Remove the #BACK entry from history
      history.replaceState(null, "", location.href.replace("#BACK", ""));

      // Trigger the first back; the popstate listener will trigger the second one
      goBackTwice = true;
      history.back();
    }
  }, 100);
});

console.info(
  `%cCASA-MIA BACK\n%cnav-back helper 0.0.2`,
  "color: green; font-weight: bold;",
  ""
);
