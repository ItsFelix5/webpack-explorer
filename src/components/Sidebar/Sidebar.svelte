<script lang="ts">
  import {
    CodeIcon,
    SearchIcon,
    AsteriskIcon,
    BookmarkIcon,
    BookAIcon,
    PaletteIcon,
    RefreshCwIcon,
    SparklesIcon,
  } from "@lucide/svelte";
  import Modules from "./Modules.svelte";
  import Search from "./Search.svelte";
  import Themes from "./Themes.svelte";
  import Bookmarks from "./Bookmarks.svelte";
  import Mappings from "./Mappings.svelte";
  import References from "./References.svelte";
  import Explain from "./Explain.svelte";
  import { loadModules } from "@data";

  const tabs = {
    modules: CodeIcon,
    search: SearchIcon,
    references: AsteriskIcon,
    bookmarks: BookmarkIcon,
    mappings: BookAIcon,
    explain: SparklesIcon,
    theme: PaletteIcon,
  };

  let width = $state(220);
  let draggingHorizontal = $state(false);
  let tab = $state<keyof typeof tabs>("modules");
</script>

<svelte:window
  onpointermove={(e) => {
    if (draggingHorizontal) width = Math.max(120, Math.min(480, e.clientX));
  }}
  onpointerup={() => (draggingHorizontal = false)}
/>

<aside style:width={width + "px"}>
  <div id="content">
    <div class="header">
      {tab}{#if tab == "modules"}
        <RefreshCwIcon
          class="button"
          style="position: absolute; right: 8px;"
          onclick={loadModules}
          size={14}
        />
      {/if}
    </div>
    {#if tab == "modules"}
      <Modules />{:else if tab == "search"}
      <Search />{:else if tab == "references"}
      <References />{:else if tab == "bookmarks"}
      <Bookmarks />{:else if tab == "mappings"}
      <Mappings />{:else if tab == "explain"}
      <Explain />{:else if tab == "theme"}
      <Themes />
    {/if}
  </div>

  <div id="tabs">
    {#each Object.entries(tabs) as [id, Icon]}
      <Icon
        class={"button" + (tab == id ? " selected" : "")}
        onclick={() => (tab = id as typeof tab)}
        size={16}
      />
    {/each}
  </div>
  <div class="resize" onpointerdown={() => (draggingHorizontal = true)}></div>
</aside>

<style>
  aside {
    position: relative;
    background-color: var(--bg-dark);
    height: 100vh;
    width: auto;
    display: flex;
    flex-direction: column;
    user-select: none;
  }

  #content {
    display: flex;
    flex-direction: column;
    height: 100%;
    overflow: auto;
  }

  #tabs {
    position: relative;
    display: flex;
    gap: 6px;
    align-items: center;
    padding: 4px 8px 6px 8px;
    height: 20px;
    border-top: 1px solid var(--border);
  }

  .resize {
    position: absolute;
    top: 0;
    right: 0;
    width: 4px;
    height: 100%;
    cursor: col-resize;
  }

  .resize:hover,
  .resize:active {
    background: var(--accent);
  }
</style>
