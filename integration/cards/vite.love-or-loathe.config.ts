import { defineConfig } from "vite";

// Love it or Loathe it's card and its thumbs, in a file of their own (cards.js) in its
// integration, which works without Casa Mia's: it loads the file into every HA page
// itself. CM_LOL_CARDS_OUT sends it elsewhere instead.
export default defineConfig({
  build: {
    outDir: process.env.CM_LOL_CARDS_OUT || "../custom_components/casa_mia_love_or_loathe/www",
    emptyOutDir: false,
    lib: { entry: "src/love-or-loathe/index.ts", formats: ["es"], fileName: () => "cards.js" },
    minify: true,
    sourcemap: false,
  },
});
