import type themes from "./lib/themes";

export type Token = {
  content: string;
  offset: number;
  type:
    | "comment"
    | "string"
    | "number"
    | "boolean"
    | "keyword"
    | "function"
    | "variable"
    | "constant"
    | "operator"
    | "property"
    | "indent";
};

export type ThemeName = keyof typeof themes;
export type Theme = (typeof themes)[ThemeName];

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
