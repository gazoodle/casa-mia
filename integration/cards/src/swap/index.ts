// The screenshot swap on every Home Assistant page (and Casa Mia's, in their iframes): the
// rules and the one being written on the Swap page, from the integration, now and at each
// change (casa_mia/swap/subscribe; HA's connection subscribes again after a reconnect).
import { whenConnected } from "../connection.ts";
import { swap } from "./dom.ts";
import type { SwapRule } from "./engine.ts";

type View = { rules?: SwapRule[]; draft?: SwapRule | null };

whenConnected("the screenshot swap", ({ conn }) =>
  conn
    .subscribeMessage((view: View) => swap(view.rules ?? [], view.draft ?? null), { type: "casa_mia/swap/subscribe" })
    .catch((err: unknown) => console.warn("CASA-MIA SWAP: the integration doesn't offer the swap:", err)),
);
