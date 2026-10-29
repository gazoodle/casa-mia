// The QR code card: an open guest login endpoint's code, or any Home Assistant page's,
// optionally with the Wi-Fi's beside it, drawn by the Casa Mia app. The parts: card.ts,
// editor.ts.
import { define, register } from "../ha.ts";
import { QrCodeCard } from "./card.ts";
import { QrCodeEditor } from "./editor.ts";

define("casa-mia-qr-code", QrCodeCard);
define("casa-mia-qr-code-editor", QrCodeEditor);
register(
  "casa-mia-qr-code",
  "Casa Mia QR code",
  "A guest login endpoint's QR code while it is open, or any page's, with the Wi-Fi's beside it if you like.",
);
