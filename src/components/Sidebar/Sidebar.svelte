<script lang="ts">
  import {
    CodeIcon,
    SearchIcon,
    BookmarkIcon,
    BookAIcon,
    PaletteIcon,
    SettingsIcon,
  } from "@lucide/svelte";
  import Modules from "./Modules.svelte";
  import Search from "./Search.svelte";
  import Themes from "./Themes.svelte";
  import Settings from "./Settings.svelte";
  import Bookmarks from "./Bookmarks.svelte";
  import Mappings from "./Mappings.svelte";

  let width = $state(220);
  let draggingHorizontal = $state(false);
  let tab = $state<
    "modules" | "search" | "bookmarks" | "mappings" | "theme" | "settings"
  >("modules");
</script>

<svelte:window
  onpointermove={(e) => {
    if (draggingHorizontal) width = Math.max(120, Math.min(480, e.clientX));
  }}
  onpointerup={() => (draggingHorizontal = false)}
/>

<aside style:width={width + "px"}>
  <div id="content">
    {#if tab == "modules"}
      <Modules />{:else if tab == "search"}
      <Search />{:else if tab == "bookmarks"}
      <Bookmarks />{:else if tab == "mappings"}
      <Mappings />{:else if tab == "theme"}
      <Themes />{:else if tab == "settings"}
      <Settings />
    {/if}
  </div>

  <div id="tabs">
    <CodeIcon onclick={() => (tab = "modules")} size={16} />
    <SearchIcon onclick={() => (tab = "search")} size={16} />
    <BookmarkIcon onclick={() => (tab = "bookmarks")} size={16} />
    <BookAIcon onclick={() => (tab = "mappings")} size={16} />
    <PaletteIcon onclick={() => (tab = "theme")} size={16} />
    <SettingsIcon onclick={() => (tab = "settings")} size={16} />
  </div>
  <div class="resize" onpointerdown={() => (draggingHorizontal = true)}></div>
</aside>

<style>
  aside {
    position: relative;
    background: var(--sideBar-background);
    height: 100vh;
    width: auto;
    display: flex;
    flex-direction: column;
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
    border-top: 1px solid var(--panel-border);
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
    background: var(--button-background);
  }
</style>
