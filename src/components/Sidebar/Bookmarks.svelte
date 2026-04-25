<script lang="ts">
  import { Bookmark, Package, PackageOpen } from "@lucide/svelte";
  import { getContext } from "svelte";
  import { flip } from "svelte/animate";
  import type { App } from "src/types";
  import { modules } from "@data";

  let ctx: App = getContext("app");

  let expanded = $state<(string | number)[]>([]);
  let files = $derived(
    Object.entries($modules).filter(([_, mods]) =>
      Object.keys(mods).some((m) => ctx.bookmarks[Number(m)]?.length),
    ),
  );
</script>

{#if files.length}
  {#each files as file}
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
      {#each file[1]
        .map((s) => Number(s))
        .filter((m) => ctx.bookmarks[m]?.length) as module}
        <button
          class="sidebar-item"
          onclick={() =>
            expanded.includes(module)
              ? (expanded = expanded.filter((f) => f !== module))
              : (expanded = [...expanded, module])}
          class:selected={ctx.openModule == module}
        >
          {ctx.mappings[module]?.[-1] || module}
        </button>
        <div style:padding-left="8px">
          {#if expanded.includes(module)}
            {#each ctx.bookmarks[module].toSorted((a, b) => a - b) as bookmark, i (bookmark)}
              <button
                class="sidebar-item"
                animate:flip
                onclick={() => {
                  ctx.openModule = module;

                  setTimeout(() => {
                    document
                      .querySelector(`.line:nth-child(${bookmark + 1})`)
                      ?.scrollIntoView({ behavior: "smooth" });
                  }, 1);
                }}
              >
                <Bookmark
                  size={16}
                  onclick={(e) => {
                    ctx.bookmarks[module].splice(i, 1);
                    e.stopPropagation();
                  }}
                  fill="var(--bookmark)"
                  color="var(--bookmark)"
                />{bookmark}
              </button>
            {/each}
          {/if}
        </div>
      {/each}
    {/if}
  {/each}
{:else}
  <span class="hint"
    >No bookmarks yet. Create one by clicking the line number</span
  >
{/if}
