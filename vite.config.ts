import { defineConfig } from "vite";
import path from "path";

export default defineConfig({
  // Relative base works for local preview and GitHub Pages project sites
  base: "./",
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "src"),
    },
  },
  build: {
    outDir: "dist-demo",
    emptyOutDir: true,
  },
});
