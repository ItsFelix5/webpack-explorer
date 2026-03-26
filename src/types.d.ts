import type themes from "./lib/themes";

export type Token = {
  content: string;
  offset: number;
  color: string;
  htmlAttrs: Record<string, string | undefined>;
  explanation?: {
    content: string;
    scopes: string[];
  }[];
};

export type ThemeName = keyof typeof themes;
export type Theme = (typeof themes)[ThemeName];

export type App = {
  openModule: number | undefined;
  history: number[];
  rewrite: boolean;
  theme: ThemeName;
  mappings: Record<number, Record<number, string>>;
  bookmarks: Record<number, number[]>;
  highlighted: number | undefined;
};
