import { createHighlighterCore, type ThemeRegistration } from "shiki/core";
import { transformerColorizedBrackets } from "@shikijs/colorized-brackets";
import { transformerRenderIndentGuides } from "@shikijs/transformers";
import { writable, derived } from "svelte/store";
import themes from "./themes";
import { createOnigurumaEngine } from "shiki";
import wasm from "shiki/wasm";

const variable = (name: string) => `var(--${name})`;
const cssTheme: ThemeRegistration = {
  name: "variables",
  type: "dark",
  colors: {
    "editor.foreground": variable("foreground"),
    "editor.background": variable("background"),
    "terminal.ansiBlack": variable("ansi-black"),
    "terminal.ansiRed": variable("ansi-red"),
    "terminal.ansiGreen": variable("ansi-green"),
    "terminal.ansiYellow": variable("ansi-yellow"),
    "terminal.ansiBlue": variable("ansi-blue"),
    "terminal.ansiMagenta": variable("ansi-magenta"),
    "terminal.ansiCyan": variable("ansi-cyan"),
    "terminal.ansiWhite": variable("ansi-white"),
    "terminal.ansiBrightBlack": variable("ansi-bright-black"),
    "terminal.ansiBrightRed": variable("ansi-bright-red"),
    "terminal.ansiBrightGreen": variable("ansi-bright-green"),
    "terminal.ansiBrightYellow": variable("ansi-bright-yellow"),
    "terminal.ansiBrightBlue": variable("ansi-bright-blue"),
    "terminal.ansiBrightMagenta": variable("ansi-bright-magenta"),
    "terminal.ansiBrightCyan": variable("ansi-bright-cyan"),
    "terminal.ansiBrightWhite": variable("ansi-bright-white"),
  },
  tokenColors: [
    {
      scope: [
        "keyword.operator.accessor",
        "meta.group.braces.round.function.arguments",
        "meta.template.expression",
        "markup.fenced_code meta.embedded.block",
      ],
      settings: { foreground: variable("foreground") },
    },
    {
      scope: "emphasis",
      settings: { fontStyle: "italic" },
    },
    {
      scope: ["strong", "markup.heading.markdown", "markup.bold.markdown"],
      settings: { fontStyle: "bold" },
    },
    {
      scope: ["markup.italic.markdown"],
      settings: { fontStyle: "italic" },
    },
    {
      scope: "meta.link.inline.markdown",
      settings: {
        fontStyle: "underline",
        foreground: variable("token-link"),
      },
    },
    {
      scope: ["string", "markup.fenced_code", "markup.inline"],
      settings: { foreground: variable("token-string") },
    },
    {
      scope: ["comment", "string.quoted.docstring.multi"],
      settings: { foreground: variable("token-comment") },
    },
    {
      scope: [
        "constant.numeric",
        "constant.language",
        "constant.other.placeholder",
        "constant.character.format.placeholder",
        "variable.language.this",
        "variable.other.object",
        "variable.other.class",
        "variable.other.constant",
        "meta.property-name",
        "meta.property-value",
        "support",
      ],
      settings: { foreground: variable("token-constant") },
    },
    {
      scope: [
        "keyword",
        "storage.modifier",
        "storage.type",
        "storage.control.clojure",
        "entity.name.function.clojure",
        "entity.name.tag.yaml",
        "support.function.node",
        "support.type.property-name.json",
        "punctuation.separator.key-value",
        "punctuation.definition.template-expression",
      ],
      settings: { foreground: variable("token-keyword") },
    },
    {
      scope: "variable.parameter.function",
      settings: { foreground: variable("token-parameter") },
    },
    {
      scope: [
        "support.function",
        "entity.name.type",
        "entity.other.inherited-class",
        "meta.function-call",
        "meta.instance.constructor",
        "entity.other.attribute-name",
        "entity.name.function",
        "constant.keyword.clojure",
      ],
      settings: { foreground: variable("token-function") },
    },
    {
      scope: [
        "entity.name.tag",
        "string.quoted",
        "string.regexp",
        "string.interpolated",
        "string.template",
        "string.unquoted.plain.out.yaml",
        "keyword.other.template",
      ],
      settings: { foreground: variable("token-string-expression") },
    },
    {
      scope: [
        "punctuation.definition.arguments",
        "punctuation.definition.dict",
        "punctuation.separator",
        "meta.function-call.arguments",
      ],
      settings: { foreground: variable("token-punctuation") },
    },
    {
      scope: [
        "markup.underline.link",
        "punctuation.definition.metadata.markdown",
      ],
      settings: { foreground: variable("token-link") },
    },
    {
      scope: ["beginning.punctuation.definition.list.markdown"],
      settings: { foreground: variable("token-string") },
    },
    {
      scope: [
        "punctuation.definition.string.begin.markdown",
        "punctuation.definition.string.end.markdown",
        "string.other.link.title.markdown",
        "string.other.link.description.markdown",
      ],
      settings: { foreground: variable("token-keyword") },
    },
    {
      scope: [
        "markup.inserted",
        "meta.diff.header.to-file",
        "punctuation.definition.inserted",
      ],
      settings: { foreground: variable("token-inserted") },
    },
    {
      scope: [
        "markup.deleted",
        "meta.diff.header.from-file",
        "punctuation.definition.deleted",
      ],
      settings: { foreground: variable("token-deleted") },
    },
    {
      scope: ["markup.changed", "punctuation.definition.changed"],
      settings: { foreground: variable("token-changed") },
    },
  ],
};

const highlighter = await createHighlighterCore({
  langs: [import("@shikijs/langs/jsx")],
  engine: createOnigurumaEngine(wasm),
  themes: [cssTheme],
});

export const theme = writable<keyof typeof themes>();

export async function applyTheme(name: keyof typeof themes) {
  localStorage.setItem("theme", name);

  if (!highlighter.getLoadedThemes().includes(name))
    await highlighter.loadTheme(themes[name].import());

  theme.set(name);
  Object.entries(highlighter.getTheme(name).colors!).forEach(([key, value]) =>
    document.documentElement.style.setProperty(
      "--" + key.replaceAll(".", "-"),
      value,
    ),
  );
}
applyTheme(
  (localStorage.getItem("theme") as keyof typeof themes) || "one-dark-pro",
);

export const tokens = (code: string) => {
  const result = highlighter.codeToTokens(code, {
    lang: "jsx",
    theme: "variables",
  });
  return result;
};

export const highlight = derived(theme, ($theme) => {
  if (!$theme) return () => "No theme :(";
  return (code: string, tokenMap?: Map<number, string>) =>
    highlighter.codeToHtml(code, {
      lang: "jsx",
      theme: $theme,
      transformers: [
        transformerColorizedBrackets(),
        transformerRenderIndentGuides(),
        {
          name: "split",
          tokens(tokens) {
            for (const line of tokens) {
              for (let i = 0; i < line.length; i++) {
                const token = line[i];
                if (typeof token.content === "string") {
                  const m = token.content.match(/^(\s+)([\s\S]+)$/);
                  if (m) {
                    line.splice(
                      i,
                      1,
                      { content: m[1], offset: token.offset },
                      {
                        ...token,
                        content: m[2],
                        offset: token.offset + m[1].length,
                      },
                    );
                    i++;
                  }
                }
              }
            }
            return tokens;
          },
        },
        {
          name: "refmap",
          tokens(tokens) {
            for (const line of tokens) {
              for (const token of line) {
                token.htmlAttrs ??= {};
                token.htmlAttrs["data-offset"] = String(token.offset);
                if (tokenMap?.has(token.offset))
                  token.htmlAttrs["data-ref-id"] = tokenMap.get(token.offset)!;
              }
            }
            return tokens;
          },
        },
        {
          name: "modules",
          tokens(tokens) {
            for (const line of tokens) {
              for (let i = 2; i < line.length - 1; i++) {
                if (
                  line[i - 2].content == "require" &&
                  line[i - 1].content == "(" &&
                  line[i + 1].content == ")"
                ) {
                  const value = parseInt(line[i].content);
                  if (!isNaN(value))
                    line[i].htmlAttrs!["data-module-id"] = String(value);
                }
              }
            }
            return tokens;
          },
        },
      ],
    });
});
