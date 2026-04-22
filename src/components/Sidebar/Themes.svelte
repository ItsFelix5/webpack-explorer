<script lang="ts">
  import { Sun, Moon } from "@lucide/svelte";
  import { getContext } from "svelte";
  import type { App, ThemeName } from "src/types";

  let ctx: App = getContext("app");

  const themes = {
    "one-dark-pro": {
      name: "One Dark Pro",
      dark: true,
    },
  };
</script>

{#each Object.entries(themes) as [id, { name, dark }]}
  <button
    class="sidebar-item"
    onclick={() => (ctx.theme = id as ThemeName)}
    class:selected={ctx.theme === id}
  >
    {#if dark}
      <Moon size={12} strokeWidth={3} />
    {:else}
      <Sun size={12} strokeWidth={3} />
    {/if}
    {name}
  </button>
{/each}
