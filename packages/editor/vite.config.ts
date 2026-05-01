import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

export default defineConfig({
  plugins: [react()],
  build: {
    outDir: "dist/client",
    emptyOutDir: true,
    rollupOptions: {
      input: { editor: "src/client/main.tsx" },
      output: {
        // Distinct prefixes let the server pick the entry deterministically
        // when there are vendor chunks (e.g. gridstack splits off ~85kB).
        entryFileNames: "editor-entry-[hash].js",
        chunkFileNames: "editor-chunk-[hash].js",
        assetFileNames: "editor-[hash].[ext]",
      },
    },
    sourcemap: true,
    target: "es2022",
  },
});
