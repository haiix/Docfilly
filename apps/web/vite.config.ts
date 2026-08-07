import { defineConfig } from "vite";

const docfillyEntry = decodeURIComponent(
  new URL("../../packages/docfilly/src/index.ts", import.meta.url).pathname,
).replace(/^\/([A-Za-z]:\/)/, "$1");

export default defineConfig({
  // GitHub Pages serves this project at https://haiix.github.io/Docfilly/.
  base: "/Docfilly/",
  resolve: {
    alias: {
      docfilly: docfillyEntry,
    },
  },
});
