<script lang="ts">
  interface FileEntry {
    name: string;
    path: string;
    content: string;
  }

  interface FolderEntry {
    name: string;
    children: (FileEntry | FolderEntry)[];
    expanded: boolean;
  }

  export let files: (FileEntry | FolderEntry)[] = [];
  export let entries: (FileEntry | FolderEntry)[] | null = null;
  export let depth: number = 0;

  export let activeTabPath: string | null = null;
  export let openFile: (f: FileEntry) => void;
  export let toggleFolder: (f: FolderEntry) => void;

  // When this component is used recursively via <svelte:self> we accept `entries` and `depth`.
  // If `entries` is not provided, render the top-level `files`.
  const renderedEntries = entries ?? files;

  function isFolder(entry: FileEntry | FolderEntry): entry is FolderEntry {
    return (entry as FolderEntry).children !== undefined;
  }
</script>

<div class="sidebar-tree">
  {#each renderedEntries as entry (isFolder(entry) ? entry.name + '-folder-' + depth : entry.path)}
    {#if isFolder(entry)}
      <!-- folder row -->
      <!-- svelte-ignore a11y_click_events_have_key_events -->
      <div
        class="tree-row folder"
        style="padding-left: {8 + depth * 12}px"
        on:click={() => toggleFolder(entry)}
        on:keydown={(e: KeyboardEvent) => { if (e.key === 'Enter' || e.key === ' ' || e.key === 'Spacebar') { e.preventDefault(); toggleFolder(entry); } }}
        role="button"
        tabindex="0"
      >
        <span class="arrow" class:expanded={entry.expanded}>▶</span>
        <span class="icon">📁</span>
        <span class="label">{entry.name}</span>
      </div>

      {#if entry.expanded}
        <!-- recurse to render children -->
        <svelte:self
          {files}
          entries={entry.children}
          depth={depth + 1}
          {activeTabPath}
          {openFile}
          {toggleFolder}
        />
      {/if}
    {:else}
      <!-- file row -->
      <!-- svelte-ignore a11y_click_events_have_key_events -->
      <div
        class="tree-row file"
        class:active={activeTabPath === entry.path}
        style="padding-left: {8 + depth * 12}px"
        on:click={() => openFile(entry)}
        on:keydown={(e: KeyboardEvent) => { if (e.key === 'Enter' || e.key === ' ' || e.key === 'Spacebar') { e.preventDefault(); openFile(entry); } }}
        role="button"
        tabindex="0"
      >
        <span class="icon">📄</span>
        <span class="label">{entry.name}</span>
      </div>
    {/if}
  {/each}
</div>
