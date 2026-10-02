import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";

const channel = process.env.DOCFILLY_CHANNEL ?? "local";
if (!["local", "main", "release"].includes(channel)) {
  throw new Error(`Unknown Docfilly build channel: ${channel}`);
}
const base = channel === "release" ? "/Docfilly/stable/" : "/Docfilly/dev/";
const preferencesKey = `docfilly-web-preferences${channel === "release" ? "" : `-${channel}`}`;
const { version } = JSON.parse(
  readFileSync(new URL("./package.json", import.meta.url), "utf8"),
) as { version: string };
const commit =
  process.env.DOCFILLY_COMMIT ??
  execFileSync("git", ["rev-parse", "HEAD"], {
    cwd: new URL(".", import.meta.url),
    encoding: "utf8",
  }).trim();

const docfillyEntry = decodeURIComponent(
  new URL("../../packages/docfilly/src/index.ts", import.meta.url).pathname,
).replace(/^\/([A-Za-z]:\/)/, "$1");
const docfillyStyles = decodeURIComponent(
  new URL("../../packages/docfilly/public/styles.css", import.meta.url).pathname,
).replace(/^\/([A-Za-z]:\/)/, "$1");
const docfillyReactEntry = decodeURIComponent(
  new URL("../../packages/react/src/index.ts", import.meta.url).pathname,
).replace(/^\/([A-Za-z]:\/)/, "$1");

export default defineConfig({
  base,
  define: {
    __DOCFILLY_BUILD__: JSON.stringify({ version, channel, commit }),
  },
  plugins: [
    {
      name: "docfilly-preferences-key",
      transformIndexHtml: {
        order: "pre",
        handler: (html) => html.replaceAll("__DOCFILLY_PREFERENCES_KEY__", preferencesKey),
      },
    },
    react(),
    VitePWA({
      injectRegister: null,
      registerType: "prompt",
      manifest: {
        id: base,
        name: channel === "release" ? "Docfilly" : "Docfilly Dev",
        short_name: channel === "release" ? "Docfilly" : "Docfilly Dev",
        description: "Open and customize local Docfilly documents in your browser.",
        start_url: ".",
        scope: base,
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
        cacheId: "docfilly",
        cleanupOutdatedCaches: true,
        globPatterns: ["**/*.{css,html,js,png,svg}"],
        navigateFallback: "index.html",
      },
    }),
  ],
  resolve: {
    alias: [
      { find: "docfilly/styles.css", replacement: docfillyStyles },
      { find: /^docfilly$/, replacement: docfillyEntry },
      { find: "@docfilly/react", replacement: docfillyReactEntry },
    ],
  },
});
