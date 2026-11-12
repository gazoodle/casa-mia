// Sensor Watch's cards. The list: what needs doing or has gone wrong, hidden when all is
// well. The gauge: one watched number on an arc of its watch's bands. The parts: common.ts
// (options, and the gauge's maths), card.ts and editor.ts (the list), gauge.ts and
// gauge-editor.ts, eye.ts (the eye in an entity's dialog) and level-colour.ts (the Status
// sensor's icon colour).
import { offerReload } from "../connection.ts";
import { define, register } from "../ha.ts";
import { SensorWatchCard } from "./card.ts";
import { CARDS_VERSION, VERSION } from "./common.ts";
import { SensorWatchEditor } from "./editor.ts";
import { TAG, WatchEye } from "./eye.ts";
import { SensorWatchGauge } from "./gauge.ts";
import { SensorWatchGaugeEditor } from "./gauge-editor.ts";
import "./level-colour.ts";

define("casa-mia-sensor-watch", SensorWatchCard);
define("casa-mia-sensor-watch-editor", SensorWatchEditor);
define("casa-mia-sensor-watch-gauge", SensorWatchGauge);
define("casa-mia-sensor-watch-gauge-editor", SensorWatchGaugeEditor);
define(TAG, WatchEye);
register(
  "casa-mia-sensor-watch-gauge",
  "Casa Mia Sensor Watch gauge",
  "One watched number on an arc coloured by its Sensor Watch bands, which follow the watch when it is edited.",
);
offerReload("Sensor Watch", CARDS_VERSION, VERSION);
register(
  "casa-mia-sensor-watch",
  "Casa Mia Sensor Watch",
  "What needs doing or has gone wrong (all of it, or one group's), worst first; hidden when all is well.",
);
