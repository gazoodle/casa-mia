import { defineConfig } from "vite";

// Sensor Watch's cards, its eye and its Status sensor's colour, in a file of their own
// (cards.js) in Sensor Watch's integration, which works without Casa Mia's: it loads the
// file into every HA page itself. Beside its panel's build (tools/build_web), so the
// folder is never emptied. CM_SW_CARDS_OUT sends it elsewhere instead: the box's own
// copy, for tools/dev_cards.
export default defineConfig({
  build: {
    outDir: process.env.CM_SW_CARDS_OUT || "../custom_components/casa_mia_sensor_watch/www",
    emptyOutDir: false,
    lib: { entry: "src/sensor-watch/index.ts", formats: ["es"], fileName: () => "cards.js" },
    minify: true,
    sourcemap: false,
  },
});
