<script lang="ts">
  import type { FileTab } from "../lib/types";

  // Accept either rune-style getters (functions) or legacy plain props.
  // Normalize into getter functions for the template.
  let { active, hasRewritten, hasDiff, onchange }: any = $props();

  const getActive = (): FileTab => (typeof active === "function" ? active() : active);
  const getHasRewritten = (): boolean =>
    typeof hasRewritten === "function" ? hasRewritten() : Boolean(hasRewritten);
  const getHasDiff = (): boolean =>
    typeof hasDiff === "function" ? hasDiff() : Boolean(hasDiff);
  const invokeChange = (tab: FileTab) => {
    if (typeof onchange === "function") onchange(tab);
  };
</script>

<div class="tab-bar">
  <button
    type="button"
    class="tab {getActive() === 'original' ? 'active' : ''}"
    onclick={() => invokeChange("original")}
  >
    Original
  </button>

  <button
    type="button"
    class="tab {getActive() === 'rewritten' ? 'active' : ''} {getHasDiff() ? 'has-diff' : ''}"
    onclick={() => invokeChange("rewritten")}
    disabled={!getHasRewritten()}
  >
    Rewritten{getHasDiff() ? " ●" : ""}
  </button>
</div>
