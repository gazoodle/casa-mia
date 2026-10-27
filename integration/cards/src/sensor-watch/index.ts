// The Sensor Watch card: what needs doing or has gone wrong, from Casa Mia's Sensor Watch,
// hidden when all is well. The parts: common.ts (options), card.ts, editor.ts, eye.ts (the
// eye in an entity's dialog) and level-colour.ts (the Status sensor's icon colour).
import { define, register } from "../ha.ts";
import { SensorWatchCard } from "./card.ts";
import { SensorWatchEditor } from "./editor.ts";
import { TAG, WatchEye } from "./eye.ts";
import "./level-colour.ts";

define("casa-mia-sensor-watch", SensorWatchCard);
define("casa-mia-sensor-watch-editor", SensorWatchEditor);
define(TAG, WatchEye);
register(
  "casa-mia-sensor-watch",
  "Casa Mia Sensor Watch",
  "What needs doing or has gone wrong (all of it, or one group's), worst first; hidden when all is well.",
);
