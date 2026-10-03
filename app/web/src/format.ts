/** "3 min ago" from an ISO timestamp; undefined in, undefined out. */
export function ago(iso: unknown): string | undefined {
  if (typeof iso !== "string" || !iso) return undefined;
  const seconds = (Date.now() - new Date(iso).getTime()) / 1000;
  if (!Number.isFinite(seconds)) return undefined;
  if (seconds < 60) return "just now";
  const units: [number, string][] = [
    [86400, "day"],
    [3600, "hour"],
    [60, "min"],
  ];
  for (const [size, name] of units) {
    if (seconds >= size) {
      const n = Math.floor(seconds / size);
      return `${n} ${name}${n === 1 || name === "min" ? "" : "s"} ago`;
    }
  }
  return undefined;
}

export function megabytes(bytes: unknown): string | undefined {
  return typeof bytes === "number" ? `${(bytes / 1e6).toFixed(0)} MB` : undefined;
}
