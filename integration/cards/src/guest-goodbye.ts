// A guest's goodbye. When the guest-login endpoint a visitor came through closes and is set
// to sign its visitors out, the app waits a few seconds before ending the session; in that
// time this sends the visitor's page to the goodbye page (or the address set for it), so
// they see a goodbye rather than Home Assistant's login screen. It reads the endpoint's
// Access switch, which every user can see: its attributes name the login's user, the
// policy (signs_out, goodbye_url) and, for a timed opening, when it closes (closes_at), so
// the page moves on that second without waiting to hear. Runs on every page, for every
// user; does nothing for an administrator or a user no endpoint signs in as.
// A page asleep when the endpoint closes wakes to the login screen: HA's login page runs
// none of this.

const POLL_MS = 1000;

type State = { entity_id: string; state: string; attributes: { [key: string]: any } };

/** Whether a switch is open now: on, and not past the end of a timed opening. */
const open = (s: State, now: number) => s.state === "on" && !(s.attributes.closes_at && now / 1000 >= s.attributes.closes_at);

/** Where this user's page should go now, or null: when one of their endpoints that signs
 * visitors out has just closed and none of their endpoints is still open. `seen` keeps
 * each of their switches' last openness between calls. */
export function goodbye(
  states: { [id: string]: State },
  me: { id: string; is_admin?: boolean } | undefined,
  seen: Map<string, boolean>,
  now: number,
  hostname: string,
): string | null {
  if (!me || me.is_admin) return null;
  const mine = Object.values(states).filter((s) => s.entity_id.startsWith("switch.") && s.attributes?.guest_user_id === me.id);
  const closed = mine.find((s) => s.attributes.signs_out && seen.get(s.entity_id) === true && !open(s, now));
  for (const s of mine) seen.set(s.entity_id, open(s, now));
  // Another open endpoint with the same login keeps the session (the app does the same).
  if (!closed || mine.some((s) => open(s, now))) return null;
  const a = closed.attributes;
  return a.goodbye_url || `http://${hostname}:${a.guest_port ?? 8675}/bye`;
}

/** Look every second, in a page of Home Assistant's. */
export function watchForGoodbye(): void {
  const seen = new Map<string, boolean>();
  setInterval(() => {
    const hass = (document.querySelector("home-assistant") as any)?.hass;
    if (!hass?.states) return;
    const url = goodbye(hass.states, hass.user, seen, Date.now(), location.hostname);
    if (url) {
      console.info("CASA-MIA CARDS: this guest's endpoint closed; going to the goodbye page");
      location.replace(url);
    }
  }, POLL_MS);
}
