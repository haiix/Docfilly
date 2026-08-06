import { defineConfig } from "vite";

const docfillyEntry = decodeURIComponent(
  new URL("../../packages/docfilly/src/index.ts", import.meta.url).pathname,
).replace(/^\/([A-Za-z]:\/)/, "$1");

export default defineConfig({
  resolve: {
    alias: {
      docfilly: docfillyEntry,
    },
  },
});
