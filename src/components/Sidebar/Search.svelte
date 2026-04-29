<script lang="ts">
  import { getContext } from "svelte";
  import type { App } from "src/types";
  import { code, modules } from "@data";
  import { CaseSensitive, Regex, WholeWord } from "@lucide/svelte";

  let ctx: App = getContext("app");
  let inputEl: HTMLInputElement;
  let query = $state("");
  let regex = $state(false);
  let wholeWord = $state(false);
  let caseSensitive = $state(false);
  let filter = $state("");
  let results: string[] | undefined = $state();

  let search = $derived.by(() => {
    let res = query;
    if (!regex) res = res.replaceAll(/[.*+?^${}()|[\]\\]/g, "\\$&");
    if (wholeWord) res = `\\b${res}\\b`;
    return new RegExp(res, !caseSensitive ? "i" : "");
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
      results = [];
      code.forEach((code, id) => {
        if (
          !id.includes(filter) &&
          !Object.entries($modules).some(
            ([file, mods]) => mods.includes(id) && file.includes(filter),
          )
        )
          return;
        if (search.test(code)) results?.push(id);
      });
    }
  }}
/>

<input
  type="text"
  placeholder="Search modules..."
  bind:value={query}
  bind:this={inputEl}
  class="search-input"
  autofocus
/>

<div class="filter-row">
  <input
    type="text"
    placeholder="Filter modules"
    class="filter"
    bind:value={filter}
  />
  <WholeWord
    class={"button" + (wholeWord ? " selected" : "")}
    onclick={() => (wholeWord = !wholeWord)}
    size={16}
  />
  <CaseSensitive
    class={"button" + (caseSensitive ? " selected" : "")}
    onclick={() => (caseSensitive = !caseSensitive)}
    size={16}
  />
  <Regex
    class={"button" + (regex ? " selected" : "")}
    onclick={() => (regex = !regex)}
    size={16}
  />
</div>

{#if results}
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
