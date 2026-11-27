// Casa Mia Clock: Home Assistant's own clock card, made to fill its place (card.ts).
import { define, register } from "../ha.ts";
import { ClockCard } from "./card.ts";

define("casa-mia-clock", ClockCard);
register(
  "casa-mia-clock",
  "Casa Mia Clock",
  "Home Assistant's clock, with all its options, made as big as its place: a Camera Commander's last place, a Tablet Layout panel.",
);
