import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";

const docfillyEntry = decodeURIComponent(
  new URL("../../packages/docfilly/src/index.ts", import.meta.url).pathname,
).replace(/^\/([A-Za-z]:\/)/, "$1");
const docfillyReactEntry = decodeURIComponent(
  new URL("../../packages/react/src/index.ts", import.meta.url).pathname,
).replace(/^\/([A-Za-z]:\/)/, "$1");

export default defineConfig({
  // GitHub Pages serves this project at https://haiix.github.io/Docfilly/.
  base: "/Docfilly/",
  plugins: [
    react(),
    VitePWA({
      injectRegister: null,
      registerType: "prompt",
      manifest: {
        id: "/Docfilly/",
        name: "Docfilly",
        short_name: "Docfilly",
        description: "Open and customize local Docfilly documents in your browser.",
        start_url: ".",
        scope: ".",
        display: "standalone",
        theme_color: "#172033",
        background_color: "#f3f5f8",
        icons: [
          {
            src: "icons/icon-192.png",
            sizes: "192x192",
            type: "image/png",
          },
          {
            src: "icons/icon-512.png",
            sizes: "512x512",
            type: "image/png",
          },
        ],
      },
      workbox: {
        cleanupOutdatedCaches: true,
        globPatterns: ["**/*.{css,html,js,png,svg}"],
        navigateFallback: "index.html",
      },
    }),
  ],
  resolve: {
    alias: {
      "@docfilly/react": docfillyReactEntry,
      docfilly: docfillyEntry,
    },
  },
});
