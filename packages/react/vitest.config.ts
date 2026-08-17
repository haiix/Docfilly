import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: {
      docfilly: fileURLToPath(new URL("../docfilly/src/index.ts", import.meta.url)),
    },
  },
  test: {
    environment: "jsdom",
    restoreMocks: true,
    clearMocks: true,
  },
});
