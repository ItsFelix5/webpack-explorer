<script lang="ts">
  import PatchesPanel from "./PatchesPanel.svelte";
  import PatchModal from "./PatchModal.svelte";

  export let activeTab: any = null;
  export let patches: any[] = [];
  export let patchesOpen: boolean = false;
  export let patchModal: any = { open: false, patchId: "", originalCode: "", sourceCode: "", origStart: 0, origEnd: 0 };

  export let setView: (tab: any, view: "original" | "rewritten") => void;
  export let openPatchModal: (tab: any) => void;
  export let copyToClipboard: (t: string) => Promise<void> | void;
  export let removePatch: (i: number) => void;
  export let setPatchesOpen: (v: boolean) => void;
  export let setPatchId: (id: string) => void;
  export let confirmPatch: () => void;
  export let cancelPatch: () => void;
  export let uniqueContext: (source: string, start: number, end: number, replacement: string) => { find: string; replace: string };

  export let getDisplayCode: (tab: any) => string | null;
  export let getHighlightedLines: (code: string) => any[][];
  export let applyRangeSelection: (lines: any[][], range: any | null) => any[][];
  export let groupSpans: (line: any[]) => any[];
  export let onCodeMouseup: (tab: any, pre: HTMLElement, view: "original" | "rewritten") => void;

  let preEl: HTMLElement | null = null;
</script>

{#if activeTab}
    <div class="view-toggle-bar">
      <button
        class="view-btn"
        class:active={activeTab.view === "original"}
        on:click={() => setView(activeTab, "original")}
      >Original</button>

      <button
        class="view-btn"
        class:active={activeTab.view === "rewritten"}
        on:click={() => setView(activeTab, "rewritten")}
      >
        Rewritten
        {#if activeTab.rewriteState?.status === "loading"}
          <span class="spinner"></span>
        {/if}
      </button>

      <div class="view-toggle-sep"></div>

      <button
        class="view-btn patch-btn"
        disabled={!activeTab.selection}
        on:click={() => openPatchModal(activeTab)}
      >＋ Create Patch</button>

      {#if patches.length > 0}
        <button
          class="view-btn patches-toggle-btn"
          class:active={patchesOpen}
          on:click={() => setPatchesOpen(!patchesOpen)}
        >Patches ({patches.length})</button>
      {/if}
    </div>

  <PatchesPanel
    {patches}
    {patchesOpen}
    {copyToClipboard}
    {removePatch}
    setPatchesOpen={setPatchesOpen}
  />

  <div class="editor-content">
    {#if activeTab.view === "rewritten" && activeTab.rewriteState?.status === "loading"}
      <div class="empty-state">
        <div class="spinner-large"></div>
        <div class="empty-label">Rewriting…</div>
      </div>
    {:else if activeTab.view === "rewritten" && activeTab.rewriteState?.status === "error"}
      <div class="empty-state">
        <div class="error-icon">⚠</div>
        <div class="empty-label error-text">{activeTab.rewriteState.message}</div>
      </div>
    {:else}
      {@const code = getDisplayCode(activeTab)}
      {#if code !== null}
          {@const lines = getHighlightedLines(code)}
          {@const activeRange = activeTab.rewriteState?.status === "done"
            ? (activeTab.view === "rewritten" ? activeTab.selection?.rewrRange : activeTab.selection?.origRange) ?? null
            : null}
          {@const markedLines = applyRangeSelection(lines, activeRange)}
          {#key activeTab.path + activeTab.view}
            {@const view = activeTab.view}
            <div class="code-view" role="region" aria-label="Code view" on:mouseup={() => preEl && onCodeMouseup(activeTab, preEl, view)}>
              <div class="line-numbers">
                {#each markedLines as _line, i}
                  <div class="line-num">{i + 1}</div>
                {/each}
              </div>

              <pre
                class="code-text"
                bind:this={preEl}
              >{#each markedLines as line, i}{#if i > 0}{"\n"}{/if}{@const groups = groupSpans(line)}{#each groups as g}<span class={g.selected ? "hl-selected" : (g.cls || undefined)}>{g.text}</span>{/each}{/each}</pre>
            </div>
          {/key}
        {:else}
          <div class="code-view">
            <div class="line-numbers">
              {#each code.split("\n") as _line, i}
                <div class="line-num">{i + 1}</div>
              {/each}
            </div>
            <pre class="code-text">{code}</pre>
          </div>
        {/if}
    {/if}
  </div>
{:else}
  <div class="editor-content">
    <div class="empty-state">
      <div class="empty-icon">{"{ }"}</div>
      <div class="empty-label">Select a file from the sidebar</div>
    </div>
  </div>
{/if}

<PatchModal
  {patchModal}
  setPatchId={setPatchId}
  {confirmPatch}
  {cancelPatch}
  {uniqueContext}
/>
