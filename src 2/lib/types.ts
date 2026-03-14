export interface EditorFile {
  name: string;
  original: string;
  rewritten?: string;
}

export type FileTab = "original" | "rewritten";

export type TokenType =
  | "keyword"
  | "string"
  | "comment"
  | "number"
  | "operator"
  | "punctuation"
  | "identifier"
  | "property"
  | "regex"
  | "plain";

export interface Token {
  type: TokenType;
  value: string;
}

export type DiffLineType = "added" | "removed" | "unchanged";

export interface DiffLine {
  type: DiffLineType;
  content: string;
  lineNo?: number;
}
