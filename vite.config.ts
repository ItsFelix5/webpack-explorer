import { defineConfig } from "vite";
import { svelte } from "@sveltejs/vite-plugin-svelte";
import { cpSync } from "fs";

export default defineConfig({
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
});
