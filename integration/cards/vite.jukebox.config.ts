import { defineConfig } from "vite";
import { homeOf } from "./vite.home.ts";

// Jukebox's page and its small card, in a file of their own (cards.js) in its
// integration, which works without Casa Mia's: it loads the file into every HA page
// itself. CM_JUKEBOX_CARDS_OUT sends it elsewhere instead.
export default defineConfig({
  define: homeOf("casa_mia_jukebox"),
  build: {
    outDir: process.env.CM_JUKEBOX_CARDS_OUT || "../custom_components/casa_mia_jukebox/www",
    emptyOutDir: false,
    lib: { entry: "src/jukebox/index.ts", formats: ["es"], fileName: () => "cards.js" },
    minify: true,
    sourcemap: false,
  },
});
