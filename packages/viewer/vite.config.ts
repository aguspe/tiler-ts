import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

export default defineConfig({
  plugins: [react()],
  build: {
    outDir: "dist/client",
    emptyOutDir: true,
    rollupOptions: {
      input: { viewer: "src/client/main.tsx" },
      output: {
        // IIFE so the report works when opened directly from the filesystem
        // (file:// URLs block ES module scripts in many browsers).
        format: "iife",
        name: "TilerViewer",
        inlineDynamicImports: true,
        entryFileNames: "viewer-[hash].js",
        assetFileNames: "viewer-[hash].[ext]",
      },
    },
    sourcemap: true,
    target: "es2020",
  },
});
