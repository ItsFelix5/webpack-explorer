<script lang="ts">
  import "./lib/shim";
  import Sidebar from "./components/Sidebar/Sidebar.svelte";
  import Editor from "./components/Editor.svelte";
  import { setContext } from "svelte";
  import { highlighter } from "./lib/highlight";
  import themes from "./lib/themes";
  import type { App, ThemeName } from "./types";

  let ready = $state(false);
  let ctx = $state<App>({
    openModule: parseInt(localStorage.getItem("open") || ""),
    history: JSON.parse(localStorage.getItem("history") ?? "[]"),
    rewrite: true,
    theme: (localStorage.getItem("theme") as ThemeName) || "one-dark-pro",
    mappings: JSON.parse(localStorage.getItem("mappings") ?? "{}"),
    bookmarks: JSON.parse(localStorage.getItem("bookmarks") ?? "{}"),
    highlighted: undefined,
  });
  if (isNaN(ctx.openModule!)) ctx.openModule = undefined;
  $effect(() => localStorage.setItem("open", ctx.openModule?.toString() || ""));
  $effect(() => {
    if (
      ctx.openModule !== undefined &&
      (ctx.history.length === 0 || ctx.history[0] !== ctx.openModule)
    ) {
      ctx.history.unshift(ctx.openModule);
      ctx.history = ctx.history
        .filter((x, i) => ctx.history.indexOf(x) == i)
        .slice(0, 20);
    }
    localStorage.setItem("history", JSON.stringify(ctx.history));
  });
  $effect(() => {
    localStorage.setItem("theme", ctx.theme);
    highlighter
      .loadTheme(themes[ctx.theme as keyof typeof themes].import())
      .then(() =>
        Object.entries(highlighter.getTheme(ctx.theme).colors!).forEach(
          ([key, value]) =>
            document.documentElement.style.setProperty(
              "--" + key.replaceAll(".", "-"),
              value,
            ),
        ),
      )
      .then(() => (ready = true));
  });
  $effect(() => localStorage.setItem("mappings", JSON.stringify(ctx.mappings)));
  $effect(() =>
    localStorage.setItem("bookmarks", JSON.stringify(ctx.bookmarks)),
  );

  setContext("app", ctx);
  window.app = ctx;
</script>

<Sidebar />
{#if ctx.openModule && ready}
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
