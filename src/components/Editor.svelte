<script lang="ts">
  import { getReferences } from "../lib/references";
  import { getCode, getAST, toCode } from "../lib/data";
  import { transform } from "../lib/transformer";
  import { getContext } from "svelte";
  import { FontStyle } from "shiki/textmate";
  import { tokenize } from "../lib/tokenize";

  let ctx: { openModule: number; rewrite: boolean } = getContext("app");
</script>

<svelte:window
  onkeydown={(e) => {
    if (e.ctrlKey) document.body.classList.add("ctrl");
  }}
  onkeyup={(e) => {
    if (!e.ctrlKey) document.body.classList.remove("ctrl");
  }}
/>

{#if ctx.rewrite}
  {#await getAST(ctx.openModule)
    .then((ast) => transform(ast))
    .then((ast) => toCode(ast))
    .then((code) => ({ code: code, ...getReferences(code) }))}
    Parsing...
  {:then { code, tokenMap, definitions }}
    {@const result = tokenize(code)}
    <pre
      style:background-color={result.bg}
      style:color={result.fg}
      style={result.rootStyle || undefined}>
<code
        >{#each result.tokens as line}<span class="line"
            >{#each line as token}<span
                style:background-color={token.bgColor}
                style:color={token.color}
                style:font-style={token.fontStyle &&
                token.fontStyle & FontStyle.Italic
                  ? "italic"
                  : undefined}
                style:font-weight={token.fontStyle &&
                token.fontStyle & FontStyle.Bold
                  ? "bold"
                  : undefined}
                style:text-decoration={token.fontStyle
                  ? token.fontStyle & FontStyle.Underline
                    ? "underline "
                    : "" + token.fontStyle &&
                        token.fontStyle & FontStyle.Strikethrough
                      ? "line-through"
                      : ""
                  : undefined}
                style={(typeof token.htmlStyle == "object" &&
                  Object.entries(token.htmlStyle)
                    .map(([key, value]) => `${key}:${value}`)
                    .join(";")) ||
                  undefined}
                {...token.htmlAttrs}>{token.content}</span
              >{/each}</span
          >{/each}</code
      ></pre>
  {:catch error}
    <p>Error: {error}</p>
  {/await}
{:else}
  {@const result = tokenize(getCode(ctx.openModule))}
  <pre
    style:background-color={result.bg}
    style:color={result.fg}
    style={result.rootStyle || undefined}>
<code
      >{#each result.tokens as line}<span class="line"
          >{#each line as token}<span
              style:background-color={token.bgColor}
              style:color={token.color}
              style:font-style={token.fontStyle &&
              token.fontStyle & FontStyle.Italic
                ? "italic"
                : undefined}
              style:font-weight={token.fontStyle &&
              token.fontStyle & FontStyle.Bold
                ? "bold"
                : undefined}
              style:text-decoration={token.fontStyle
                ? token.fontStyle & FontStyle.Underline
                  ? "underline "
                  : "" + token.fontStyle &&
                      token.fontStyle & FontStyle.Strikethrough
                    ? "line-through"
                    : ""
                : undefined}
              style={(typeof token.htmlStyle == "object" &&
                Object.entries(token.htmlStyle)
                  .map(([key, value]) => `${key}:${value}`)
                  .join(";")) ||
                undefined}
              {...token.htmlAttrs}>{token.content}</span
            >{/each}</span
        >{/each}</code
    ></pre>{/if}
