<script lang="ts">
  import { transform } from "@lib/transformer";
  import { getContext, untrack } from "svelte";
  import type { App } from "src/types";
  import Line from "./Line.svelte";
  import { code } from "@data";
  import { parse } from "@babel/parser";
  import Printer from "@lib/generator/printer";
  import { ChevronUp, ChevronDown } from "@lucide/svelte";

  let ctx: App = getContext("app");
  let searchQuery = $state("");
  let searchBarVisible = $state(false);
  let searchResults: number[] = $derived(
    !searchQuery || !ctx.openModule
      ? []
      : ctx.tokens
          .map((line, i) =>
            line
              .map((t) => t.content)
              .join("")
              .includes(searchQuery)
              ? i
              : -1,
          )
          .filter((i) => i !== -1),
  );
  let currentResultIndex = $state(0);

  function navigateResults(direction: number) {
    if (searchResults.length === 0) return;
    currentResultIndex =
      (currentResultIndex + direction) % searchResults.length;
    document
      .querySelector(`[data-line="${searchResults[currentResultIndex]}"]`)
      ?.scrollIntoView({ behavior: "smooth", block: "center" });
  }

  $effect(() => {
    ctx.openModule;
    ctx.rewrite;
    ctx.theme;
    untrack(async () => {
      ctx.highlighted = undefined;
      ctx.tokens = [];
      console.time("full");
      console.time("get");
      const fn = code.get(ctx.openModule!)!;
      const ast = parse(/^\s*function\s*\(/.test(fn) ? `(${fn})` : fn);
      console.timeEnd("get");
      if (ctx.rewrite) {
        console.time("transform");
        transform(ast);
        console.timeEnd("transform");
      }
      console.time("tokenize");
      //const map = new GenMapping()
      //setSourceContent(map, "", fn);
      const printer = new Printer(null);
      printer.print(ast);
      if (printer.queuedChar !== 32) printer._flush();

      ctx.tokens.push(...printer.tokens);
      console.timeEnd("tokenize");
      console.timeEnd("full");
    });
  });
</script>

<svelte:window
  onkeydown={(e) => {
    if (e.ctrlKey) document.body.classList.add("ctrl");
    if (e.key == "F2" && ctx.highlighted != undefined) {
      const name = prompt("New name?");
      if (name) {
        let module = ctx.openModule!;
        let ref = ctx.highlighted;

        const original = ctx.tokens
          .flat()
          .find((t) => t.reference == ctx.highlighted)?.content;
        if (original?.startsWith("mod_")) {
          const mod = original.substring(4);
          if (!isNaN(parseInt(mod))) {
            module = mod;
            ref = -1;
          }
        }

        ctx.mappings[module] ||= {};
        ctx.mappings[module][ref] = name;
      }
    }

    if ((e.ctrlKey || e.metaKey) && (e.key === "f" || e.key === "g")) {
      e.preventDefault();
      e.stopPropagation();
      searchBarVisible = !searchBarVisible;
    }
    if (e.key === "Escape" && searchBarVisible) {
      e.preventDefault();
      searchBarVisible = false;
      searchQuery = "";
    }
    if (e.key === "Enter" && searchBarVisible) {
      if (e.shiftKey) navigateResults(-1);
      else navigateResults(1);
    }
  }}
  onkeyup={(e) => {
    if (!e.ctrlKey) document.body.classList.remove("ctrl");
  }}
/>

<pre>{#if searchBarVisible}<div class="search-bar"><input
        id="file-search"
        type="text"
        placeholder="Search in file..."
        bind:value={searchQuery}
        autofocus
      /><button onclick={() => navigateResults(-1)}
        ><ChevronUp size={14} /></button
      ><button onclick={() => navigateResults(1)}
        ><ChevronDown size={14} /></button
      >{#if searchResults.length > 0}<span class="search-count"
          >{currentResultIndex + 1}/{searchResults.length}</span
        >{:else if searchQuery}<span class="search-count">No results</span
        >{/if}</div>{/if}<code
    >{#each ctx.tokens as line, i (line)}<Line
        {line}
        {i}
        {searchResults}
        {currentResultIndex}
      />{/each}</code
  ></pre>

<style>
  .search-bar {
    position: sticky;
    top: 0;
    background: var(--bg-dark);
    padding: 4px 8px;
    border-bottom: 1px solid var(--border);
    display: flex;
    align-items: center;
    gap: 8px;
    z-index: 10;
    user-select: none;
  }

  .search-bar input {
    flex: 1;
    padding: 2px 4px;
    background: var(--bg);
    border: 1px solid var(--border);
    border-radius: 4px;
    color: var(--text);
    font-size: 12px;
    outline: none;
  }

  .search-count {
    font-size: 11px;
    color: var(--text-muted);
    white-space: nowrap;
  }

  .search-bar button {
    padding: 2px 6px;
    background: var(--bg);
    border: 1px solid var(--border);
    border-radius: 4px;
    color: var(--text);
    cursor: pointer;
    font-size: 12px;
    display: flex;
    align-items: center;
    justify-content: center;
  }
</style>
