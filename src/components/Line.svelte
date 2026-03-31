<script lang="ts">
  import { getContext } from "svelte";
  import type { App, Token } from "src/types";
  import { Bookmark } from "@lucide/svelte";

  let ctx: App = getContext("app");
  let {
    line,
    i,
    interactive = true,
  }: { line: Token[]; i: number; interactive?: boolean } = $props();
</script>

<div class="line">
  <span class="lineNumber"
    ><span
      style:color={ctx.bookmarks[ctx.openModule!]?.includes(i)
        ? "var(--bookmark)"
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
        : "var(--editor-background)"}
      color={ctx.bookmarks[ctx.openModule!]?.includes(i)
        ? "var(--bookmark)"
        : "var(--editorLineNumber-foreground)"}
    /></span
  >{#each line as token, i (token)}{@const reference =
      ctx.references!.tokenMap.get(token.offset)}{@const module =
      i >= 2 &&
      line.length > i + 1 &&
      line[i - 2].content == "require" &&
      line[i - 1].content == "(" &&
      line[i + 1].content == ")"
        ? parseInt(token.content)
        : NaN}<span
      {...token.htmlAttrs}
      class:highlighted={reference != undefined && ctx.highlighted == reference}
      class:highlighted-hover={reference != undefined &&
        ctx.hovered == reference}
      class:module={!isNaN(module)}
      style:color={token.color}
      data-offset={token.offset}
      data-definition={ctx.references!.definitions.get(token.offset)}
      onclick={(e) => {
        if (e.button != 0 || !interactive) return;
        ctx.highlighted = reference;
        if (e.ctrlKey && !isNaN(module)) ctx.openModule = module;
        else if (e.ctrlKey)
          document
            .querySelector(`[data-definition="${reference}"]`)
            ?.scrollIntoView({ behavior: "smooth" });
      }}
      onmouseover={() => (ctx.hovered = reference)}
      onmouseout={() => (ctx.hovered = undefined)}
      >{(token.content.startsWith("mod_")
        ? ctx.mappings[parseInt(token.content.substring(4))]?.[-1]
        : reference != undefined &&
          ctx.mappings[ctx.openModule!]?.[reference]) || token.content}</span
    >{/each}
</div>
