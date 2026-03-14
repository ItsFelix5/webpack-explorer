<script lang="ts">
  import "./lib/shim";
  import Sidebar from "./components/Sidebar/Sidebar.svelte";
  import Editor from "./components/Editor.svelte";
  import { setContext } from "svelte";

  let context = $state<{
    openModule: number | undefined;
    rewrite: boolean;
  }>({
    openModule: undefined,
    rewrite: true,
  });
  setContext("app", context);
</script>

<Sidebar />
{#if context.openModule}
  <main>
    <Editor />
  </main>
{:else}
  <div class="empty">
    <span>{"{ }"}</span>
    Select a file from the sidebar
  </div>
{/if}

<style>
  main {
    flex: 1;
    min-width: 0;
  }

  .empty {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    flex: 1;
    gap: 12px;
    color: var(--descriptionForeground);
    font-size: 13px;
    user-select: none;
  }

  .empty > span {
    font-size: 40px;
    opacity: 0.25;
    font-weight: 300;
    letter-spacing: -2px;
  }
</style>
