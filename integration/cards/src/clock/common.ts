// Casa Mia Clock: the time to show, worked out without a page so it can be tested. The
// card (card.ts) draws it to fill whatever space it is given, digital or analogue.
import type { Hass } from "../ha.ts";

export type Config = {
  type: string;
  clock_style?: "digital" | "analog";
  /** auto: as the language of the user's profile has it. */
  time_format?: "auto" | "12" | "24";
  show_seconds?: boolean;
  /** An IANA zone ("Europe/London"); empty: as the user's profile has it. */
  time_zone?: string;
  no_background?: boolean;
};

/** Each option's default: shown in the editor and never saved. */
export const DEFAULTS = { clock_style: "digital", time_format: "auto", show_seconds: false, time_zone: "", no_background: false };

export type Time = {
  hour: number; // 0-23, for the hands
  minute: number;
  second: number;
  /** As shown: "09:05", "9:05", "09:05:42". */
  text: string;
  /** "am" or "pm" (or the language's own) on a 12-hour clock, else "". */
  period: string;
};

/** Whether the clock shows 12 hours: as set, or as the language does by itself. */
export function twelveHour(format: Config["time_format"], language: string): boolean {
  if (format === "12" || format === "24") return format === "12";
  const cycle = new Intl.DateTimeFormat(language, { hour: "numeric" }).resolvedOptions().hourCycle;
  return cycle === "h11" || cycle === "h12";
}

/** The zone to show the time in: the card's own, else the server's when the user's
 * profile says so (Settings, Profile, Time zone), else this device's (undefined). */
export function zoneOf(config: Config, hass?: Hass): string | undefined {
  if (config.time_zone) return config.time_zone;
  return hass?.locale?.time_zone === "server" ? hass.config?.time_zone : undefined;
}

/** The time at `now` in `zone`. */
export function timeIn(now: Date, zone: string | undefined, twelve: boolean, seconds: boolean, language = "en-GB"): Time {
  const parts = new Intl.DateTimeFormat(language, {
    timeZone: zone,
    hour: twelve ? "numeric" : "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: twelve ? "h12" : "h23",
  }).formatToParts(now);
  const part = (type: string) => parts.find((p) => p.type === type)?.value ?? "";

  // The hands need the 24-hour hour whatever is shown.
  const hour24 = Number(
    new Intl.DateTimeFormat("en-GB", { timeZone: zone, hour: "2-digit", hourCycle: "h23" }).formatToParts(now).find((p) => p.type === "hour")?.value,
  );
  const [hour, minute, second] = [part("hour"), part("minute"), part("second")];
  return {
    hour: hour24 % 24,
    minute: Number(minute),
    second: Number(second),
    text: seconds ? `${hour}:${minute}:${second}` : `${hour}:${minute}`,
    period: twelve ? part("dayPeriod") : "",
  };
}

/** How many ems wide the digital time is (tabular figures are about 0.6 em, a colon about
 * 0.3), so the card can size it to fill its width (card.ts). */
export function emsWide(time: Time): number {
  const digits = time.text.replace(/\D/g, "").length;
  const colons = time.text.length - digits;
  return digits * 0.6 + colons * 0.3 + (time.period ? 0.4 * (time.period.length * 0.6 + 0.3) : 0);
}
