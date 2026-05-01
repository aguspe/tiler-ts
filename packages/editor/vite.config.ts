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
        entryFileNames: "editor-[hash].js",
        assetFileNames: "editor-[hash].[ext]",
        chunkFileNames: "editor-[hash].js",
      },
    },
    sourcemap: true,
    target: "es2022",
  },
});
