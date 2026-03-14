<script lang="ts">
  interface PatchModal {
    open: boolean;
    patchId: string;
    originalCode: string;
    sourceCode: string;
    origStart: number;
    origEnd: number;
  }

  export let patchModal: PatchModal = { open: false, patchId: "", originalCode: "", sourceCode: "", origStart: 0, origEnd: 0 };
  export let setPatchId: (id: string) => void;
  export let confirmPatch: () => void;
  export let cancelPatch: () => void;
  export let uniqueContext: (source: string, start: number, end: number, replacement: string) => { find: string; replace: string };
</script>

{#if patchModal.open}
  <!-- backdrop: clicking closes, but keyboard should also be supported; inner modal is the dialog -->
  <div class="modal-backdrop" role="presentation" on:click={cancelPatch}>
    <!-- inner modal: treat as dialog, trap focus is out of scope but provide keyboard handler for Escape -->
    <div
      class="modal"
      role="dialog"
      aria-modal="true"
      aria-labelledby="patch-modal-title"
      on:click={(e) => { (e as MouseEvent).stopPropagation(); }}
      tabindex="0"
      on:keydown={(e) => { if ((e as KeyboardEvent).key === 'Escape') cancelPatch(); }}
    >
      <div class="modal-title" id="patch-modal-title">Create Patch</div>

      <div class="modal-body">
        <div class="modal-field">
          <label class="modal-label" for="patch-id-input">Require ID</label>
          <input
            id="patch-id-input"
            class="modal-input"
            type="text"
            placeholder="e.g. 0xbad225b5 or 'my-patch'"
            value={patchModal.patchId}
            on:input={(e) => setPatchId((e.target as HTMLInputElement).value)}
            on:keydown={(e) => { if ((e as KeyboardEvent).key === 'Enter') confirmPatch(); if ((e as KeyboardEvent).key === 'Escape') cancelPatch(); }}
            aria-describedby="patch-id-help"
          />
          <div id="patch-id-help" class="sr-only">Enter a require id, then press Create</div>
        </div>

        <div class="modal-field">
          <div class="modal-label" id="selected-code-label">Selected code</div>
          <code class="modal-code-preview" id="selected-code" aria-labelledby="selected-code-label">{patchModal.originalCode}</code>
        </div>

        <div class="modal-field">
          <div class="modal-label" id="generated-patch-label">Generated patch</div>
          {#if patchModal.patchId.trim()}
            {@const _id = patchModal.patchId.trim()}
            {@const _ctx = uniqueContext(patchModal.sourceCode, patchModal.origStart, patchModal.origEnd, `require(${_id})(()=>${patchModal.originalCode})`)}
            <code class="modal-code-preview modal-code-generated" id="generated-patch" aria-labelledby="generated-patch-label">'{_ctx.find}':'{_ctx.replace}'</code>
          {:else}
            <code class="modal-code-preview modal-code-generated" id="generated-patch" aria-labelledby="generated-patch-label">—</code>
          {/if}
        </div>
      </div>

      <div class="modal-actions">
        <button class="modal-btn modal-btn-cancel" on:click={cancelPatch}>Cancel</button>
        <button class="modal-btn modal-btn-confirm" disabled={!patchModal.patchId.trim()} on:click={confirmPatch}>Create</button>
      </div>
    </div>
  </div>
{/if}
