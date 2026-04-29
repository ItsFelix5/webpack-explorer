<script lang="ts">
  import { Package, PackageOpen } from "@lucide/svelte";
  import { modules } from "@data";
  import { getContext } from "svelte";
  import type { App } from "src/types";

  let ctx: App = getContext("app");

  let expanded = $state<string[]>([
    Object.entries($modules).find(([_, m]) =>
      m.includes(ctx.openModule!),
    )?.[0] || "",
  ]);
  let draggingVertical = $state(false);
  let height = $state(220);
</script>

<svelte:window
  onpointermove={(e) => {
    if (draggingVertical) {
      const viewportHeight =
        document.documentElement.clientHeight || window.innerHeight;
      height = Math.max(4, Math.min(406, viewportHeight - 56 - e.clientY));
    }
  }}
  onpointerup={() => (draggingVertical = false)}
/>

<div class="modules">
  {#each Object.entries($modules) as file}
    <button
      style="margin: 5px 0 0 0;"
      class="sidebar-item"
      onclick={() =>
        expanded.includes(file[0])
          ? (expanded = expanded.filter((f) => f !== file[0]))
          : (expanded = [...expanded, file[0]])}
    >
      {#if expanded.includes(file[0])}
        <PackageOpen size={14} strokeWidth={2.25} />
      {:else}
        <Package size={14} strokeWidth={2.25} />
      {/if}
      {file[0]}
    </button>
    {#if expanded.includes(file[0])}
      {#each file[1] as module}
        <button
          class="sidebar-item"
          onclick={() => (ctx.openModule = module)}
          class:selected={ctx.openModule == module}
        >
          {ctx.mappings[module]?.[-1] || module}
        </button>
      {/each}
    {/if}
  {/each}
</div>

<div class="recent" style:height={height + "px"}>
  <div class="resize" onpointerdown={() => (draggingVertical = true)}></div>
  <div class="header">Recent</div>
  <div class="recent-list">
    {#each ctx.history as module}
      <button
        class="sidebar-item"
        onclick={() => (ctx.openModule = module)}
        class:selected={ctx.openModule == module}
      >
        {module}
      </button>
    {/each}
  </div>
</div>

<div class="sources" class:rewritten={ctx.rewrite}>
  <div class="sources-indicator"></div>
  <button onclick={() => (ctx.rewrite = false)} class:active={!ctx.rewrite}
    >Original</button
  >
  <button onclick={() => (ctx.rewrite = true)} class:active={ctx.rewrite}
    >Rewritten</button
  >
</div>

<style>
  .resize {
    position: absolute;
    top: 0;
    right: 0;
    height: 4px;
    width: 100%;
    cursor: row-resize;
  }

  .resize:hover,
  .resize:active {
    background: var(--accent);
  }

  .modules {
    flex: 1 1 auto;
    min-height: 0;
    overflow: auto;
    padding-bottom: 8px;
  }

  .recent {
    width: 100%;
    position: relative;
    display: flex;
    flex-direction: column;
    overflow: hidden;
    flex: 0 0 auto;
  }

  .recent-list {
    padding-top: 8px;
    overflow: auto;
  }

  .sources {
    position: relative;
    display: flex;
    gap: 6px;
    align-items: center;
    padding: 4px 0px 6px 0px;
    height: 20px;
  }

  .sources::before {
    content: "";
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    height: 1px;
    background: var(--border);
  }

  .sources-indicator {
    position: absolute;
    top: 0;
    left: 0;
    height: 1px;
    width: 50%;
    background: var(--accent);
    transform: translateX(0);
    transition:
      transform 220ms ease-in,
      width 220ms;
    z-index: 1;
  }

  .sources.rewritten .sources-indicator {
    transform: translateX(100%);
  }

  .sources button {
    font-size: 11px;
    color: var(--text);
    padding: 4px 6px;
    border-radius: 0;
    background: transparent;
    border: none;
    position: relative;
    z-index: 2;
    flex: 1 1 0;
    text-align: center;
    box-sizing: border-box;
    letter-spacing: 0.08em;
  }

  .sources button.active {
    font-weight: bold;
  }
</style>
