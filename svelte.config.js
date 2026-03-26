import { vitePreprocess } from "@sveltejs/vite-plugin-svelte";

/** @type {import("@sveltejs/vite-plugin-svelte").SvelteConfig} */
export default {
  preprocess: vitePreprocess(),
  compilerOptions: {
    runes: true,
    warningFilter: (warning) =>
      !warning.filename?.includes("node_modules") &&
      !warning.code.startsWith("a11y"),
  },
};
