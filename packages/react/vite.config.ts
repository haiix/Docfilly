import { defineConfig } from "vite";

export default defineConfig({
  build: {
    lib: {
      entry: "src/index.ts",
      name: "DocfillyReact",
      fileName: (format) => `react.${format === "es" ? "js" : "cjs"}`,
      formats: ["es", "cjs"],
    },
    rollupOptions: {
      external: ["docfilly", "react", "react/jsx-runtime"],
    },
  },
});
