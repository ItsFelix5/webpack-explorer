<script lang="ts">
    import type { EditorFile } from "../lib/types";

    // Rune-style props extraction: props are reactive getters
    // Accept either rune-style getters or legacy props; normalize to getters
    // The parent may pass either `files` as a function (rune) or an array (legacy).
    // We normalize into `_getFiles`, `_getSelected`, and `_onselect` which the
    // template uses uniformly.
    let { files, selected, onselect }: any = $props();
    const _getFiles: () => EditorFile[] =
        typeof files === "function" ? files : () => files ?? [];
    const _getSelected: () => string =
        typeof selected === "function" ? selected : () => selected ?? "";
    const _onselect: (name: string) => void =
        typeof onselect === "function" ? onselect : (n: string) => {};

    // Local rune-style state
    let width = $state(220);
    let dragging = $state(false);
    let startX = $state(0);
    let startWidth = $state(0);

    function handlePointerDown(e: PointerEvent) {
        dragging = true;
        startX = e.clientX;
        startWidth = width;
        try {
            (e.target as HTMLElement)?.setPointerCapture?.(
                (e as any).pointerId,
            );
        } catch {
            // ignore if not supported
        }
        e.preventDefault();
    }

    function handlePointerMove(e: PointerEvent) {
        if (!dragging) return;
        width = Math.max(120, Math.min(480, startWidth + e.clientX - startX));
    }

    function handlePointerUp() {
        dragging = false;
    }
</script>

<svelte:window
    onpointermove={handlePointerMove}
    onpointerup={handlePointerUp}
/>

<aside style="width: {width}px">
    <div class="sidebar-header">Files</div>

    <ul class="file-list" role="list">
        {#each _getFiles() as file}
            <li>
                <button
                    class="file-item"
                    class:active={_getSelected() === file.name}
                    onclick={() => _onselect(file.name)}
                    title={file.name}
                    type="button"
                >
                    {file.name}
                </button>
            </li>
        {/each}
    </ul>

    <!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
    <div
        class="resize-handle"
        role="separator"
        aria-orientation="vertical"
        onpointerdown={handlePointerDown}
        aria-label="Resize files panel"
    ></div>
</aside>
