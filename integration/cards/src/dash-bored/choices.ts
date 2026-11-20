// A device's settings that are a choice from a list: a thermostat's mode, a player's
// source, a light's effect. Home Assistant gives each as a list of options and the one
// that stands, and takes a call to choose another. They are in one table here, so that a
// new one is a row, and every family has it from `Device.choices` (house.ts).
import type { Kind } from "./house.ts";
import type { Press } from "./stories.ts";

/** One such setting: what it is called, its options, the one that stands if any does, and the call that chooses. */
export type Choice = { what: string; options: string[]; now?: string; service: string; key: string };

// By kind: what it is called, the attribute that lists its options, the attribute that
// holds the one that stands ("" where that is the entity's state), the service that
// chooses, and the name the service gives the option.
const CHOICES: Partial<Record<Kind, [what: string, list: string, now: string, service: string, key: string][]>> = {
  climate: [
    ["Mode", "hvac_modes", "", "climate.set_hvac_mode", "hvac_mode"],
    ["Preset", "preset_modes", "preset_mode", "climate.set_preset_mode", "preset_mode"],
    ["Fan", "fan_modes", "fan_mode", "climate.set_fan_mode", "fan_mode"],
  ],
  media_player: [
    ["Source", "source_list", "source", "media_player.select_source", "source"],
    ["Sound", "sound_mode_list", "sound_mode", "media_player.select_sound_mode", "sound_mode"],
  ],
  fan: [["Preset", "preset_modes", "preset_mode", "fan.set_preset_mode", "preset_mode"]],
  humidifier: [["Mode", "available_modes", "mode", "humidifier.set_mode", "mode"]],
  water_heater: [["Mode", "operation_list", "operation_mode", "water_heater.set_operation_mode", "operation_mode"]],
  vacuum: [["Suction", "fan_speed_list", "fan_speed", "vacuum.set_fan_speed", "fan_speed"]],
  light: [["Effect", "effect_list", "effect", "light.turn_on", "effect"]],
};

/** The choices an entity of this kind has now. One with fewer than two options is no choice, and is left out. */
export function choices(kind: Kind, state?: { state: string; attributes: Record<string, any> }): Choice[] {
  if (!state || state.state === "unavailable") return [];
  return (CHOICES[kind] ?? []).flatMap(([what, list, now, service, key]): Choice[] => {
    const options = Array.isArray(state.attributes[list]) ? state.attributes[list].filter((o: unknown): o is string => typeof o === "string") : [];
    const stands = now ? state.attributes[now] : state.state;
    return options.length > 1 ? [{ what, options, now: typeof stands === "string" ? stands : undefined, service, key }] : [];
  });
}

/** The call that chooses an option. */
export const choosing = (id: string, c: Choice, option: string): Press => ({ domain: c.service.split(".")[0], service: c.service.split(".")[1], ids: [id], data: { [c.key]: option } });

/** An option as it is read: Home Assistant's are words joined by underscores. */
export const worded = (option: string) => option.replace(/_/g, " ");
