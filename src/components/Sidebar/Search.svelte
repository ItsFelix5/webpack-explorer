<script lang="ts">
  import { getContext } from "svelte";
  import type { App } from "src/types";
  import { search } from "../../lib/code";
  import { CaseSensitive, Regex, WholeWord } from "@lucide/svelte";

  let ctx: App = getContext("app");
  let inputEl: HTMLInputElement;
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

{#if ctx.search.query && ctx.search.query.length >= 2}
  {@const results = search(ctx.search)}
  {#if results.length === 0}
    <div class="hint">No results found</div>
  {:else}
    {#each results as result}
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
  <div class="hint">
    Type at least 2 characters to search. Keep in mind this searches original
    code
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
