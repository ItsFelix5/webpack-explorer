export type Token = {
  content: string;
  reference?: number;
  definition?: boolean;
  type:
    | ""
    | "comment"
    | "string"
    | "regex"
    | "number"
    | "boolean"
    | "keyword"
    | "function"
    | "variable"
    | "builtin"
    | "constant"
    | "operator"
    | "bracket"
    | "class"
    | "indent"
    | "punctuation";
};

export type ThemeName = "one-dark-pro";

export type App = {
  openModule?: number;
  history: number[];
  rewrite: boolean;
  theme: ThemeName;
  mappings: Record<number, Record<number, string>>;
  bookmarks: Record<number, number[]>;
  highlighted?: number;
  hovered?: number;
  tokens: Token[][];
};
