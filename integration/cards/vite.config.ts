import { defineConfig } from "vite";
import { home } from "./vite.home.ts";

// One file, cm-cards.js, into the integration's www/ (committed: tools/build_cards), which
// the integration loads into every HA page. CM_CARDS_OUT sends it elsewhere instead: the
// box's own copy, for tools/dev_cards (save, refresh, no restart).
const out = process.env.CM_CARDS_OUT || "../custom_components/casa_mia/www";
export default defineConfig({
  define: home("https://github.com/gazoodle/casa-mia"),
  build: {
    outDir: out,
    emptyOutDir: false,
    lib: { entry: "src/main.ts", formats: ["es"], fileName: () => "cm-cards.js" },
    minify: true,
    sourcemap: false,
  },
});
