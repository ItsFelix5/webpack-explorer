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
      getAST(ctx.openModule!)
        .then(async (ast) => {
          if (ctx.rewrite) {
            const transformed = transform(ast);
            const code = await toCode(transformed);
            ctx.references = getReferences(code);
            tokenize(getCode(ctx.openModule!), transformed, ctx.tokens);
          } else {
            tokenize(getCode(ctx.openModule!), ast, ctx.tokens);
          }
        })
        .then(() => console.timeEnd("tokenize"));
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
