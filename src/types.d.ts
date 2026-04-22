export type Token = {
  content: string;
  offset: number;
  type:
    | "" //
    | "comment" //
    | "string"
    | "regex" //
    | "number" //
    | "boolean" //
    | "keyword" //
    | "function" //
    | "variable" //
    | "builtin" //
    | "constant"
    | "operator" //
    | "bracket" //
    | "property"
    | "indent" //
    | "punctuation"; //
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
  references?: {
    tokenMap: Map<number, number>;
    definitions: Map<number, number>;
    usages: Map<number, number[]>;
  };
  tokens: Token[][];
  search: Search;
};

export type Search = {
  query: string;
  filter: string;
  wholeWord: boolean;
  caseSensitive: boolean;
  regex: boolean;
};
