import { defineConfig } from "vite";

// Tablet Layout, garnish and the Over layer in a file of their own
// (casa-mia-tablet-layout.js), published by itself as a dashboard plugin. It is in no
// integration's www/: Casa Mia's own copy of them is in cm-cards.js. CM_TL_OUT sends it
// elsewhere instead.
export default defineConfig({
  build: {
    outDir: process.env.CM_TL_OUT || "../plugins",
    emptyOutDir: false,
    lib: { entry: "src/alone.ts", formats: ["es"], fileName: () => "casa-mia-tablet-layout.js" },
    minify: true,
    sourcemap: false,
  },
});
