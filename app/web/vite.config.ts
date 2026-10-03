import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

// Built into the Python package and committed (tools/build_web), so the app image needs no
// Node. `base: "./"` names the bundles relative to <base href>, which the server rewrites to
// the ingress prefix. `npm run dev` proxies /health to an app running locally.
export default defineConfig({
  plugins: [react()],
  base: "./",
  build: { outDir: "../src/casa_mia/web", emptyOutDir: true },
  server: { proxy: { "/health": "http://127.0.0.1:8780" } },
});
