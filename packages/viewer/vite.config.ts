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
        entryFileNames: "viewer-[hash].js",
        assetFileNames: "viewer-[hash].[ext]",
        chunkFileNames: "viewer-[hash].js",
      },
    },
    sourcemap: true,
    target: "es2022",
  },
});
