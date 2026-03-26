<script lang="ts">
  import { getCode, getAST, toCode } from "../lib/data";
  import { transform } from "../lib/transformer";
  import { getContext, untrack } from "svelte";
  import { tokenize } from "../lib/highlight";
  import type { App, Token } from "src/types";
  import { getReferences } from "../lib/references";
  import { Bookmark } from "@lucide/svelte";

  let ctx: App = getContext("app");
  let tokens = $state<Token[][]>([]);
  let hovered: number | undefined = $state();
  let references: {
    tokenMap: Map<number, number>;
    definitions: Map<number, number>;
  };
  $effect(() => {
    ctx.openModule;
    ctx.rewrite;
    ctx.theme;
    untrack(() => {
      ctx.highlighted = undefined;
      tokens = [];
      console.time("tokenize");
      if (ctx.rewrite) {
        getAST(ctx.openModule!)
          .then((ast) => transform(ast))
          .then((ast) => toCode(ast))
          .then(
            (code) =>
              (references = getReferences(code)) &&
              tokenize(code, ctx.theme, tokens),
          )
          .then(() => console.timeEnd("tokenize"));
      } else {
        tokenize(getCode(ctx.openModule!), ctx.theme, tokens);
        console.timeEnd("tokenize");
      }
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

        const original = tokens
          .flat()
          .find(
            (t) => references.tokenMap.get(t.offset) == ctx.highlighted,
          )?.content;
        if (original?.startsWith("mod_")) {
          const mod = parseInt(original.substring(4));
          if (!isNaN(mod)) {
            module = mod;
            ref = -1;
          }
        }

        ctx.mappings[module] ||= {};
        ctx.mappings[module][ref] = name;
      }
    }
  }}
  onkeyup={(e) => {
    if (!e.ctrlKey) document.body.classList.remove("ctrl");
  }}
/>

<pre><code
    >{#each tokens as line, i (line)}<div class="line"><span class="lineNumber"
          ><span
            style:color={ctx.bookmarks[ctx.openModule!]?.includes(i)
              ? "var(--bookmark)"
              : ""}>{i + 1}</span
          ><Bookmark
            size={16}
            onclick={() => {
              ctx.bookmarks[ctx.openModule!] ||= [];
              const bookmarks = ctx.bookmarks[ctx.openModule!];
              if (bookmarks?.includes(i))
                bookmarks.splice(bookmarks.indexOf(i), 1);
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
            references.tokenMap.get(token.offset)}{@const definition =
            reference == undefined
              ? undefined
              : references.definitions.get(reference)}{@const module =
            i >= 2 &&
            line.length > i + 1 &&
            line[i - 2].content == "require" &&
            line[i - 1].content == "(" &&
            line[i + 1].content == ")"
              ? parseInt(token.content)
              : NaN}<span
            {...token.htmlAttrs}
            class:highlighted={reference != undefined &&
              ctx.highlighted == reference}
            class:highlighted-hover={reference != undefined &&
              hovered == reference}
            class:module={!isNaN(module)}
            style:color={token.color}
            data-offset={token.offset}
            data-definition={definition != undefined &&
              definition == token.offset &&
              reference}
            onclick={(e) => {
              if (e.button != 0) return;
              ctx.highlighted = reference;
              if (e.ctrlKey && definition)
                document
                  .querySelector(`[data-definition="${reference}"]`)
                  ?.scrollIntoView({ behavior: "smooth" });
              else if (e.ctrlKey && !isNaN(module)) ctx.openModule = module;
            }}
            onmouseover={() => (hovered = reference)}
            onmouseout={() => (hovered = undefined)}
            >{(token.content.startsWith("mod_")
              ? ctx.mappings[parseInt(token.content.substring(4))]?.[-1]
              : reference != undefined &&
                ctx.mappings[ctx.openModule!]?.[reference]) ||
              token.content}</span
          >{/each}</div>{/each}</code
  ></pre>
