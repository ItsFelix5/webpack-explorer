<script lang="ts">
  import { Package, PackageOpen, Trash } from "@lucide/svelte";
  import { files } from "../../lib/data";
  import { getContext } from "svelte";
  import type { App } from "src/types";

  let ctx: App = getContext("app");

  let expanded = $state<(string | number)[]>([]);
</script>

<div class="modules">
  <div class="header">Mappings</div>
  {#each Object.entries(files).filter( ([_, mods]) => Object.keys(mods).some((m) => ctx.mappings[Number(m)]), ) as file}
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
      {#each Object.keys(file[1]).filter((m) => ctx.mappings[m]) as unknown as number[] as module}
        <button
          class="sidebar-item"
          onclick={() =>
            expanded.includes(module)
              ? (expanded = expanded.filter((f) => f !== module))
              : (expanded = [...expanded, module])}
          class:selected={ctx.openModule == module}
        >
          {ctx.mappings[module]?.[-1] || module}
          {#if ctx.mappings[module]?.[-1]}<Trash
              style="position: absolute; right: 8px;"
              onclick={(e) => {
                delete ctx.mappings[module]?.[-1];
                e.stopPropagation();
              }}
              size={14}
            />{/if}
        </button>
        <div style:padding-left="8px">
          {#if expanded.includes(module)}
            {#each Object.entries(ctx.mappings[module]).filter(([m, _]) => m != "-1") as mapping}
              <button
                class="sidebar-item"
                onclick={() => {
                  ctx.openModule = module;

                  setTimeout(() => {
                    ctx.highlighted = Number(mapping[0]);
                    document
                      .querySelector(`[data-definition="${mapping[0]}"]`)
                      ?.scrollIntoView({ behavior: "smooth" });
                  }, 1);
                }}
              >
                {mapping[1]}<Trash
                  style="position: absolute; right: 8px;"
                  onclick={(e) => {
                    delete ctx.mappings[module][Number(mapping[0])];
                    e.stopPropagation();
                  }}
                  size={14}
                />
              </button>
            {/each}
          {/if}
        </div>
      {/each}
    {/if}
  {/each}
</div>
