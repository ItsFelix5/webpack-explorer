<script lang="ts">
  import type { EditorFile, FileTab, DiffLine } from "../lib/types";
  import { tokenize, tokensToHtml } from "../lib/highlight";
  import { computeDiff } from "../lib/diff";

  // Rune-style props: parent may provide getters (functions)
  // Rune-style props - allow nullable file getter
  let {
    file,
    tab,
    onnavigate,
  }: {
    file: () => EditorFile | null;
    tab: () => FileTab;
    onnavigate: (name: string) => void;
  } = $props();

  // Derived: the source string depending on active tab
  const displaySource = $derived(() =>
    tab() === "original" ? file().original : (file().rewritten ?? "")
  );

  // Derived: if viewing rewritten and it's different from original -> produce diff
  // diffLines derived when viewing rewritten and different
  const diffLines = $derived.by<DiffLine[] | null>(() => {
    if (tab() !== "rewritten") return null;
    const f = file();
    if (!f || !f.rewritten) return null;
    if (f.rewritten === f.original) return null;
    return computeDiff(f.original, f.rewritten);
  });

  // Derived: highlighted HTML lines when not showing diff
  // highlightedLines derived when not in diff mode
  const highlightedLines = $derived.by<string[] | null>(() => {
    if (diffLines() !== null) return null;
    const src = displaySource();
    return src.split("\n").map((line: string) => tokensToHtml(tokenize(line)));
  });

  // Ctrl/Cmd + click navigation
  function handleClick(e: MouseEvent) {
    if (!(e.ctrlKey || e.metaKey)) return;
    const word = getWordAtPoint(e.clientX, e.clientY);
    if (!word) return;
    const match = word.match(/^["'`](.+?)["'`]$/);
    const name = match ? match[1] : word;
    onnavigate(name);
  }

  // Robust method to obtain a word at viewport coordinates
  function getWordAtPoint(x: number, y: number): string | null {
    let range: Range | null = null;

    // caretPositionFromPoint
    if (typeof (document as any).caretPositionFromPoint === "function") {
      try {
        const pos = (document as any).caretPositionFromPoint(x, y);
        if (pos && pos.offsetNode) {
          range = document.createRange();
          range.setStart(pos.offsetNode, pos.offset);
          range.setEnd(pos.offsetNode, pos.offset);
        }
      } catch {
        range = null;
      }
    }

    // caretRangeFromPoint fallback
    if (!range && typeof (document as any).caretRangeFromPoint === "function") {
      try {
        range = (document as any).caretRangeFromPoint(x, y);
      } catch {
        range = null;
      }
    }

    // As last resort find a text node under point
    if (!range) {
      const el = document.elementFromPoint(x, y) as Element | null;
      if (!el) return null;
      const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT, null);
      let node = walker.currentNode as Text | null;
      if (!node) node = walker.nextNode() as Text | null;
      if (!node) return null;
      range = document.createRange();
      range.setStart(node, 0);
      range.setEnd(node, 0);
    }

    const node = range.startContainer;
    if (!node || node.nodeType !== Node.TEXT_NODE) return null;
    const content = node.textContent ?? "";
    let offset = range.startOffset;
    if (offset > content.length) offset = content.length;

    // Expand to identifier-like boundaries
    let start = offset;
    let end = offset;
    while (start > 0 && /[\w$'"\-]/.test(content[start - 1])) start--;
    while (end < content.length && /[\w$'"\-]/.test(content[end])) end++;

    const word = content.slice(start, end).trim();
    return word || null;
  }
</script>

{#if diffLines() !== null}
  <div class="editor-lines" role="presentation" onclick={handleClick}>
    {#each diffLines() as dl, i}
      <div class={"code-line diff-" + dl.type}>
        <span class="line-no">{dl.lineNo ?? ""}</span>
        <span class="diff-gutter">{dl.type === "added" ? "+" : dl.type === "removed" ? "-" : " "}</span>
        <span class="line-content">{@html tokensToHtml(tokenize(dl.content)) || "&ZeroWidthSpace;"}</span>
      </div>
    {/each}
  </div>
{:else}
  <div class="editor-lines" role="presentation" onclick={handleClick}>
    {#each (highlightedLines() ?? []) as html, i}
      <div class="code-line">
        <span class="line-no">{i + 1}</span>
        <span class="line-content">{@html html || "&ZeroWidthSpace;"}</span>
      </div>
    {/each}
  </div>
{/if}
