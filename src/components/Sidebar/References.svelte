<script lang="ts">
  import { getContext } from "svelte";
  import type { App } from "src/types";
  import Line from "../Line.svelte";

  let ctx: App = getContext("app");

  const lines: number[] = $derived(
    ctx
      .references!.usages.get(ctx.highlighted!)
      ?.map((usage) =>
        ctx.tokens.findIndex((line) => line.some((t) => t.offset == usage)),
      ) || [],
  );
</script>

{#if ctx.highlighted}
  <div class="references">
    {#each lines as i}
      <div
        onclick={() =>
          document
            .querySelector(`.line:nth-child(${i + 1})`)
            ?.scrollIntoView({ behavior: "smooth" })}
      >
        <Line line={ctx.tokens[i]} {i} interactive={false} />
      </div>
    {/each}
  </div>
{:else}
  <span class="hint">Select a variable to view its references</span>
{/if}

<style>
  .references {
    overflow: scroll;
    text-wrap: nowrap;
    height: 100%;
  }
</style>
