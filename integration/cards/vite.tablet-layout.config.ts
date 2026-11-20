import { readFileSync } from "node:fs";
import { defineConfig } from "vite";

// Tablet Layout, garnish and the Over layer in a file of their own
// (casa-mia-tablet-layout.js), published by itself as a dashboard plugin. It is in no
// integration's www/: Casa Mia's own copy of them is in cm-cards.js. CM_TL_OUT sends it
// elsewhere instead.
// Its version, kept in the built file as a marker that tools/component_versions.py stamps
// when the file changes. Read back from the lock here, so that building unchanged sources
// again gives the same file.
const lock = JSON.parse(readFileSync("../versions.lock.json", "utf8"));
const version = lock["casa-mia-tablet-layout"]?.version ?? "0";

export default defineConfig({
  define: { __CM_STAMP__: JSON.stringify(`cm-plugin-version@${version}`) },
  build: {
    outDir: process.env.CM_TL_OUT || "../plugins",
    emptyOutDir: false,
    lib: { entry: "src/alone.ts", formats: ["es"], fileName: () => "casa-mia-tablet-layout.js" },
    minify: true,
    sourcemap: false,
  },
});
