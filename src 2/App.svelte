<script lang="ts">
  import './lib/shim';
  import { onMount } from "svelte";
  import { getFiles } from "./lib/data";
  import type { EditorFile, FileTab, DiffLine } from "./lib/types";
  import Sidebar from "./components/Sidebar.svelte";
  import TabBar from "./components/TabBar.svelte";
  import Editor from "./components/Editor.svelte";
  import { rewrite } from "./lib/rewrite";
  import { computeDiff, hasDiff } from "./lib/diff";

  let files = $state<EditorFile[]>([]);
  let selectedName = $state<string | null>(null);
  let activeTab = $state<FileTab>("rewritten");
  let rewriteError = $state<string | null>(null);

  // Derived getters
  const selectedFile = $derived(() =>
    files.find((f: EditorFile) => f.name === selectedName()) ?? null
  );

  const diffLines = $derived.by(() => {
    const sf = selectedFile();
    if (!sf || !sf.rewritten) return null;
    return computeDiff(sf.original, sf.rewritten);
  });

  const hasRewritten = $derived(() => !!selectedFile()?.rewritten);

  const currentHasDiff: Derived<boolean> = $derived(() => {
    const d = diffLines();
    return d !== null && hasDiff(d);
  });

  function selectFile(name: string) {
    selectedName(name);
    activeTab("rewritten");
    rewriteError(null);
  }

  function navigate(name: string) {
    const found = files().find((f) => f.name === name || f.name.startsWith(name));
    if (found) selectFile(found.name);
  }

  function changeTab(tab: FileTab) {
    activeTab(tab);
  }

  function addFiles(incoming: EditorFile[]) {
    for (const f of incoming) {
      if (files().find((e) => e.name === f.name)) continue;
      let rewritten: string | undefined;
      rewriteError(null);
      try {
        rewritten = rewrite(f.original);
      } catch (e) {
        rewriteError(String(e));
        rewritten = undefined;
      }
      files([...files(), { ...f, rewritten }]);
    }
    if (!selectedName() && files().length > 0) selectFile(files()[0].name);
  }

  // Expose global setter for host
  // @ts-ignore
  ;(window as any).setFiles = (incoming: EditorFile[]) => {
    const prepared = incoming.map((f) => {
      let rewritten: string | undefined;
      rewriteError(null);
      try {
        rewritten = rewrite(f.original);
      } catch (e) {
        rewriteError(String(e));
        rewritten = undefined;
      }
      return { ...f, rewritten };
    });
    files(prepared);
    if (!selectedName() && files().length > 0) selectFile(files()[0].name);
  };

  onMount(() => {
    try {
      const built = getFiles();
      if (built && built.length) addFiles(built);
    } catch {
      // ignore if data module isn't present
    }
  });
</script>

<div class="layout" role="main">
  <Sidebar files={files} selected={selectedName} onselect={selectFile} />

  <div class="main">
    {#if selectedFile()}
      <TabBar
        active={activeTab}
        hasRewritten={hasRewritten}
        hasDiff={currentHasDiff}
        onchange={changeTab}
      />
      {#if rewriteError() && activeTab() === "rewritten"}
        <div class="error-banner">{rewriteError()}</div>
      {/if}
      <Editor file={selectedFile} tab={activeTab} onnavigate={navigate} />
    {:else}
      <div class="empty-state">
        <p>Files are provided by the website — select one from the sidebar.</p>
      </div>
    {/if}
  </div>
</div>
