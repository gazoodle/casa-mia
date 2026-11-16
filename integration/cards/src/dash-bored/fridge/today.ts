// The Fridge's notepad: what the day comes to.
import { lights, type House } from "../house.ts";

/** The notepad's lines: what the day comes to, said as somebody would jot it down. */
export function today(house: House): string[] {
  const devices = house.rooms.flatMap((r) => r.devices);
  const lit = lights(house).filter((d) => d.on).length;
  const undone = devices.filter((d) => d.kind === "lock" && !d.on && !d.away);
  const warm = house.rooms.filter((r) => r.temp !== undefined).sort((a, b) => b.temp! - a.temp!);
  const home = house.people.filter((p) => p.place === "home").map((p) => p.name);
  return [
    lit ? `${lit} ${lit === 1 ? "light" : "lights"} on` : "All the lights are off",
    ...(house.kw === undefined ? [] : [`Using ${house.kw.toFixed(2)} kW`]),
    ...undone.map((d) => `${d.room} ${d.name} is UNLOCKED!`),
    ...(house.outside ? [`Outside: ${house.outside.temp.toFixed(1)}°, ${house.outside.sky.replace("partlycloudy", "partly cloudy").replace(/[-_]/g, " ")}`] : []),
    ...(warm.length > 1 ? [`Warmest: ${warm[0].name} ${warm[0].temp!.toFixed(1)}°`, `Coldest: ${warm.at(-1)!.name} ${warm.at(-1)!.temp!.toFixed(1)}°`] : []),
    ...(house.people.length ? [home.length ? `In: ${home.join(", ")}` : "Nobody is in"] : []),
  ];
}
