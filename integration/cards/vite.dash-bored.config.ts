import { defineConfig } from "vite";

// Dash-Bored's page and card, in a file of their own (cards.js) in its integration, which
// works without Casa Mia's: it loads the file into every HA page itself.
// CM_DASH_BORED_OUT sends it elsewhere instead.
export default defineConfig({
  build: {
    outDir: process.env.CM_DASH_BORED_OUT || "../custom_components/casa_mia_dash_bored/www",
    emptyOutDir: false,
    lib: { entry: "src/dash-bored/index.ts", formats: ["es"], fileName: () => "cards.js" },
    minify: true,
    sourcemap: false,
  },
});
