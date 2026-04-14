<script lang="ts">
  import { getCode, getAST, toCode } from "../lib/data";
  import { transform } from "../lib/transformer";
  import { getContext, untrack } from "svelte";
  import { tokenize } from "../lib/highlight";
  import type { App } from "src/types";
  import { getReferences } from "../lib/references";
  import Line from "./Line.svelte";

  let ctx: App = getContext("app");
  $effect(() => {
    ctx.openModule;
    ctx.rewrite;
    ctx.theme;
    untrack(() => {
      ctx.highlighted = undefined;
      ctx.tokens = [];
      console.time("tokenize");
      if (ctx.rewrite) {
        getAST(ctx.openModule!)
          .then((ast) => transform(ast))
          .then((ast) => toCode(ast))
          .then((code) => {
            ctx.references = getReferences(code);
            tokenize(code, ctx.theme, ctx.tokens);
          })
          .then(() => console.timeEnd("tokenize"));
      } else {
        tokenize(getCode(ctx.openModule!), ctx.theme, ctx.tokens);
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

        const original = ctx.tokens
          .flat()
          .find(
            (t) => ctx.references!.tokenMap.get(t.offset) == ctx.highlighted,
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
    >{#each ctx.tokens as line, i (line)}<Line {line} {i} />{/each}</code
  ></pre>
