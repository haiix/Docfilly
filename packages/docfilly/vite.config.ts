import { defineConfig } from "vite";

export default defineConfig({
  build: {
    lib: {
      entry: "src/index.ts",
      name: "Docfilly",
      fileName: (format) => `docfilly.${format === "es" ? "js" : "cjs"}`,
      formats: ["es", "cjs"],
    },
  },
});
