import { defineConfig } from "vite";
import { svelte } from "@sveltejs/vite-plugin-svelte";
import { cpSync } from "fs";

export default defineConfig(({ mode }) => ({
  plugins: [
    svelte(),
    {
      name: "cp",
      writeBundle: () => cpSync("extension", "dist", { recursive: true }),
    },
  ],
  build: {
    rollupOptions: {
      input: "index.html",
    },
  },
  resolve: {
    alias: {
      "@lib": "/src/lib",
      "@data": mode === "development" ? "/src/lib/mock" : "/src/lib/interface",
    },
  },
}));
