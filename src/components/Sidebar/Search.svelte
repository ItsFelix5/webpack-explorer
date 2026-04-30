<script lang="ts">
  import { getContext } from "svelte";
  import type { App } from "src/types";
  import { code, modules } from "@data";
  import { CaseSensitive, Regex, WholeWord } from "@lucide/svelte";

  let ctx: App = getContext("app");
  let inputEl: HTMLInputElement;

  let search = $derived.by(() => {
    let res = ctx.search.query;
    if (!ctx.search.regex) res = res.replaceAll(/[.*+?^${}()|[\]\\]/g, "\\$&");
    if (ctx.search.wholeWord) res = `\\b${res}\\b`;
    return new RegExp(res, !ctx.search.caseSensitive ? "i" : "");
  });
</script>

<svelte:window
  onkeydown={(e) => {
    const target = e.target as HTMLElement;
    if (
      document.activeElement !== inputEl &&
      target.tagName !== "INPUT" &&
      target.tagName !== "TEXTAREA" &&
      !target.isContentEditable
    )
      inputEl?.focus();
    if (e.key === "Enter") {
      ctx.search.results = [];
      code.forEach((code, id) => {
        if (
          !id.includes(ctx.search.filter) &&
          !Object.entries($modules).some(
            ([file, mods]) => mods.includes(id) && file.includes(ctx.search.filter),
          )
        )
          return;
        if (search.test(code)) ctx.search.results?.push(id);
      });
    }
  }}
/>

<input
  type="text"
  placeholder="Search modules..."
  bind:value={ctx.search.query}
  bind:this={inputEl}
  class="search-input"
  autofocus
/>

<div class="filter-row">
  <input
    type="text"
    placeholder="Filter modules"
    class="filter"
    bind:value={ctx.search.filter}
  />
  <WholeWord
    class={"button" + (ctx.search.wholeWord ? " selected" : "")}
    onclick={() => (ctx.search.wholeWord = !ctx.search.wholeWord)}
    size={16}
  />
  <CaseSensitive
    class={"button" + (ctx.search.caseSensitive ? " selected" : "")}
    onclick={() => (ctx.search.caseSensitive = !ctx.search.caseSensitive)}
    size={16}
  />
  <Regex
    class={"button" + (ctx.search.regex ? " selected" : "")}
    onclick={() => (ctx.search.regex = !ctx.search.regex)}
    size={16}
  />
</div>

{#if ctx.search.results}
  {#if ctx.search.results.length === 0}
    <div class="hint">No results found</div>
  {:else}
    {#each ctx.search.results as result}
      <button
        class="sidebar-item"
        onclick={() => (ctx.openModule = result)}
        class:selected={ctx.openModule == result}
      >
        {result}
      </button>
    {/each}
  {/if}
{:else}
  <div
    class="hint"
    style:color="var(--text-muted)"
    style:font-size="10px"
    style:position="absolute"
    style:bottom="30px"
  >
    Keep in mind that this searches unformatted original code
  </div>
{/if}

<style>
  .search-input {
    width: 100%;
    padding: 6px 8px;
    background: transparent;
    border: none;
    color: var(--text);
    font-size: 12px;
    outline: none;
    box-sizing: border-box;
  }

  .filter-row {
    display: flex;
    align-items: center;
    gap: 4px;
    padding: 4px 8px;
    border-top: 1px solid var(--border);
  }

  .filter {
    flex: 1;
    min-width: 0;
    border: none;
    border-radius: 4px;
    background-color: var(--bg);
    color: var(--text);
  }
</style>
