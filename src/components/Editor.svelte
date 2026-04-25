<script lang="ts">
  import { transform } from "../lib/transformer";
  import { getContext, untrack } from "svelte";
  import { tokenize } from "../lib/highlight";
  import type { App } from "src/types";
  import { getReferences } from "../lib/references";
  import Line from "./Line.svelte";
  import { code } from "@data";
  import { parse } from "@babel/parser";

  let ctx: App = getContext("app");
  $effect(() => {
    ctx.openModule;
    ctx.rewrite;
    ctx.theme;
    untrack(async () => {
      ctx.highlighted = undefined;
      ctx.tokens = [];
      console.time("full");
      console.time("get");
      const fn = code.get(ctx.openModule! + "")!;
      const ast = parse(/^\s*function\s*\(/.test(fn) ? `(${fn})` : fn);
      console.timeEnd("get");
      if (ctx.rewrite) {
        console.time("transform");
        const transformed = transform(ast);
        console.timeEnd("transform");
        console.time("references");
        ctx.references = getReferences(ast);
        console.timeEnd("references");
        console.time("tokenize");
        tokenize(fn, transformed, ctx.tokens);
        console.timeEnd("tokenize");
      } else {
        tokenize(fn, ast, ctx.tokens);
      }
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
