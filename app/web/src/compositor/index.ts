/** Camera compositor: its pipeline, as it runs now, polled while open. Gatherer (every
 * camera channel: its state, size, source and who wants it) → cache (each picture kept,
 * with a thumbnail; click for a live preview) → generators (live and preview: the
 * pictures drawn) → servers (live and preview: who is watching, and how fast it goes).
 * Each stage pauses and runs on its own; the cache purges whole or a picture at a time;
 * Restart restarts both engines. */
// The parts: cache.tsx, common.tsx, engines.tsx, gatherer.tsx, health.tsx, page.tsx.
export { CompositorPage } from "./page";
