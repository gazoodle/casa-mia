import assert from "node:assert/strict";
import { test } from "node:test";
import { roomCard, roomy } from "./room.ts";

test("a room's card keeps its one room, says it is alone and is an ordinary card's size", () => {
  class Whole {
    told: any;
    setConfig(config: any) {
      this.told = config;
    }
    getGridOptions() {
      return { columns: "full" };
    }
  }
  const card: any = new (roomCard(Whole as any, "dash-bored-fridge-room"))();
  card.setConfig({ type: "custom:dash-bored-fridge-room", room: "den", style: "yuppies" });
  assert.deepEqual(card.told.rooms, ["den"]);
  assert.equal(card.told.style, "yuppies");
  assert.equal(card._alone, true);
  assert.equal(card.getGridOptions().columns, 6);

  // With no room chosen it keeps none, and not the whole house: a card's own `rooms` does not get by.
  card.setConfig({ rooms: ["kitchen", "hall"] });
  assert.deepEqual(card.told.rooms, []);
});

test("a new room card begins with a room that has a light in it", () => {
  const hass: any = {
    states: {},
    areas: { attic: {}, den: {}, hall: {} },
    devices: { lamp: { area_id: "hall" } },
    entities: { "switch.fan": { entity_id: "switch.fan", area_id: "attic" }, "light.hidden": { entity_id: "light.hidden", area_id: "attic", hidden: true }, "light.lamp": { entity_id: "light.lamp", device_id: "lamp" } },
  };
  assert.equal(roomy(hass), "hall");
  assert.equal(roomy({ ...hass, entities: {} }), "attic");
  assert.equal(roomy({ states: {} } as any), "");
});
