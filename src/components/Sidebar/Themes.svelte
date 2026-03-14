<script lang="ts">
  import { Sun, Moon } from "@lucide/svelte";
  import { applyTheme, theme } from "../../lib/highlight";
  import themes from "../../lib/themes";
</script>

<div class="header">Theme</div>
<div>
  {#each Object.entries(themes).sort((a, b) => {
    if (a[1].dark !== b[1].dark) return (a[1].dark ? 0 : 1) - (b[1].dark ? 0 : 1);
    return a[1].name.localeCompare(b[1].name);
  }) as [id, { name, dark }]}
    <button
      class="sidebar-item"
      on:click={() => applyTheme(id as keyof typeof themes)}
      style:background-color={$theme === id
        ? "var(--editor-selectionBackground)"
        : "transparent"}
    >
      {#if dark}
        <Moon size={12} strokeWidth={4} />
      {:else}
        <Sun size={12} strokeWidth={4} />
      {/if}
      {name}
    </button>
  {/each}
</div>
