// Shared types for components
// Keep small and dependency-free so components can import these types directly.

export interface FileEntry {
  name: string;
  path: string;
  content: string;
}

export interface FolderEntry {
  name: string;
  children: (FileEntry | FolderEntry)[];
  expanded: boolean;
}

export function isFolder(entry: FileEntry | FolderEntry): entry is FolderEntry {
  return (entry as FolderEntry).children !== undefined;
}

export type CharRange = { start: number; end: number };

export type RewriteState<Result = any> =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "done"; result: Result }
  | { status: "error"; message: string };

export interface Selection {
  origRange: CharRange;
  rewrRange: CharRange;
}

export interface Patch {
  id: string;
  patchId: string;
  originalCode: string;
  find: string;
  replace: string;
}

export interface PatchModal {
  open: boolean;
  patchId: string;
  originalCode: string;
  sourceCode: string;
  origStart: number;
  origEnd: number;
}

export type TabView = "original" | "rewritten";

export interface Tab {
  path: string;
  name: string;
  content: string;
  view: TabView;
  rewriteState: RewriteState;
  selection: Selection | null;
}

export interface MarkedSpan {
  cls?: string;
  text: string;
  selected: boolean;
}
