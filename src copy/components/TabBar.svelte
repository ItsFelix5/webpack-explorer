<script lang="ts">
  interface Tab {
    path: string;
    name: string;
    content?: string;
  }

  export let tabs: Tab[] = [];
  export let activeTabPath: string | null = null;

  // callbacks provided by parent
  export let closeTab: (path: string, e: MouseEvent) => void;
  export let setActive: (path: string) => void;
</script>

<div class="tab-bar-inner">
  {#each tabs as tab (tab.path)}
    <!-- svelte-ignore a11y_click_events_have_key_events -->
    <div
      class="tab"
      class:active={activeTabPath === tab.path}
      on:click={() => setActive(tab.path)}
      role="button"
      tabindex="0"
    >
      <span class="tab-icon">📄</span>
      <span class="tab-name">{tab.name}</span>
      <!-- svelte-ignore a11y_click_events_have_key_events -->
      <span class="tab-close" role="button" tabindex="0" on:click={(e) => closeTab(tab.path, e)} title="Close">✕</span>
    </div>
  {/each}

  {#if tabs.length === 0}
    <div class="tab-placeholder"></div>
  {/if}
</div>
