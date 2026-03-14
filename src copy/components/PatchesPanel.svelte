<script lang="ts">
  interface Patch {
    id: string;
    patchId: string;
    originalCode: string;
    find: string;
    replace: string;
  }

  export let patches: Patch[] = [];
  export let patchesOpen: boolean = false;

  // callbacks provided by parent
  export let copyToClipboard: (text: string) => Promise<void> | void;
  export let removePatch: (index: number) => void;
  export let setPatchesOpen: (open: boolean) => void;
</script>

{#if patchesOpen && patches.length > 0}
  <div class="patches-panel">
    <div class="patches-panel-header">
      <span>Patches</span>
      <div>
        <button
          class="patch-action-btn"
          on:click={() => copyToClipboard(JSON.stringify(Object.fromEntries(patches.map(p => [p.find, p.replace])), null, 2))}
          title="Copy all patches"
        >Copy All</button>
        <button class="patches-close-btn" on:click={() => setPatchesOpen(false)} aria-label="Close patches panel">✕</button>
      </div>
    </div>

    <div class="patches-list" role="list">
      {#each patches as patch, i (patch.id)}
        <div class="patch-item" role="listitem">
          <div class="patch-item-header">
            <span class="patch-label">require(<span class="patch-id">{patch.patchId}</span>)</span>
            <div class="patch-item-actions">
              <button
                class="patch-action-btn"
                on:click={() => copyToClipboard(JSON.stringify({ [patch.find]: patch.replace }, null, 2))}
                title="Copy patch mapping"
              >Copy</button>
              <button
                class="patch-action-btn patch-remove-btn"
                on:click={() => removePatch(i)}
                title="Remove patch"
                aria-label="Remove patch"
              >✕</button>
            </div>
          </div>

          <div class="patch-original-row">
            <span class="patch-section-label">Original:</span>
            <code class="patch-code-snippet">{patch.originalCode}</code>
          </div>

          <div class="patch-generated-row">
            <span class="patch-section-label">Generated:</span>
            <code class="patch-code-snippet patch-code-generated">{JSON.stringify({ [patch.find]: patch.replace })}</code>
          </div>
        </div>
      {/each}
    </div>
  </div>
{/if}
