import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

// Sensor Watch's panel in Home Assistant's sidebar (src/sensor-watch/panel.tsx), built
// into the integration and committed (tools/build_web builds it after the admin page).
// The names are fixed: the integration's panel.py names panel.js, with the version as a
// query, and panel.tsx loads panel.css from beside it.
export default defineConfig({
  plugins: [react()],
  base: "./",
  build: {
    outDir: "../../integration/custom_components/casa_mia/sensor_watch/www",
    emptyOutDir: true,
    cssCodeSplit: false,
    rollupOptions: {
      input: "src/sensor-watch/panel.tsx",
      output: { entryFileNames: "panel.js", assetFileNames: "panel[extname]" },
    },
  },
});
