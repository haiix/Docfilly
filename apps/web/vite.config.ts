import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

const docfillyEntry = decodeURIComponent(
  new URL("../../packages/docfilly/src/index.ts", import.meta.url).pathname,
).replace(/^\/([A-Za-z]:\/)/, "$1");
const docfillyReactEntry = decodeURIComponent(
  new URL("../../packages/react/src/index.ts", import.meta.url).pathname,
).replace(/^\/([A-Za-z]:\/)/, "$1");

export default defineConfig({
  // GitHub Pages serves this project at https://haiix.github.io/Docfilly/.
  base: "/Docfilly/",
  plugins: [react()],
  resolve: {
    alias: {
      "@docfilly/react": docfillyReactEntry,
      docfilly: docfillyEntry,
    },
  },
});
