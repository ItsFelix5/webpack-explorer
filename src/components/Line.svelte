<script lang="ts">
  import { getContext } from "svelte";
  import type { App, Token } from "src/types";
  import { Bookmark } from "@lucide/svelte";

  let ctx: App = getContext("app");
  let {
    line,
    i,
    interactive = true,
    searchResults = [],
    currentResultIndex = 0,
  }: {
    line: Token[];
    i: number;
    interactive?: boolean;
    searchResults?: number[];
    currentResultIndex?: number;
  } = $props();
</script>

<div class="line" data-line={i}>
  <span class="lineNumber"
    ><span
      style:color={ctx.bookmarks[ctx.openModule!]?.includes(i)
        ? "var(--bookmark)"
        : searchResults.includes(i)
          ? "var(--text)"
          : ""}>{i + 1}</span
    ><Bookmark
      size={16}
      onclick={(e) => {
        ctx.bookmarks[ctx.openModule!] ||= [];
        const bookmarks = ctx.bookmarks[ctx.openModule!];
        if (bookmarks?.includes(i)) bookmarks.splice(bookmarks.indexOf(i), 1);
        else bookmarks.push(i);
      }}
      fill={ctx.bookmarks[ctx.openModule!]?.includes(i)
        ? "var(--bookmark)"
        : "var(--bg)"}
      color={ctx.bookmarks[ctx.openModule!]?.includes(i)
        ? "var(--bookmark)"
        : "var(--text-muted)"}
    /></span
  ><span
    style:background-color={searchResults[currentResultIndex] === i
      ? " rgba(255, 255, 0, 0.3)"
      : searchResults.includes(i)
        ? "rgba(255, 255, 0, 0.1)"
        : undefined}
    >{#each line as token, i (token)}{@const module =
        i >= 2 &&
        line.length > i + 1 &&
        line[i - 2].content == "require" &&
        line[i - 1].content == "(" &&
        line[i + 1].content == ")" &&
        !isNaN(parseInt(token.content))}<span
        class={token.type}
        class:highlighted={token.reference != undefined &&
          ctx.highlighted == token.reference}
        class:highlighted-hover={token.reference != undefined &&
          ctx.hovered == token.reference}
        class:module
        data-definition={token.definition && token.reference}
        onclick={(e) => {
          if (e.button != 0 || !interactive) return;
          ctx.highlighted = token.reference;
          if (e.ctrlKey && module) ctx.openModule = token.content;
          else if (e.ctrlKey)
            document
              .querySelector(`[data-definition="${token.reference}"]`)
              ?.scrollIntoView({ behavior: "smooth" });
        }}
        onmouseover={() => (ctx.hovered = token.reference)}
        onmouseout={() => (ctx.hovered = undefined)}
        >{(token.content.startsWith("mod_") &&
          ctx.mappings[parseInt(token.content.substring(4))]?.[-1]) ||
          (token.reference != undefined &&
            ctx.mappings[ctx.openModule!]?.[token.reference]) ||
          token.content}</span
      >{/each}</span
  >
</div>
