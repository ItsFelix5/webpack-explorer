import {
  EncodedTokenMetadata,
  INITIAL,
  Registry,
  type IRawTheme,
} from "shiki/textmate";
import langs from "@shikijs/langs-precompiled/jsx";
import { createOnigurumaEngine, type ThemeRegistration } from "shiki";
import wasm from "shiki/wasm";
import slackDark from "@shikijs/themes/slack-dark";

let engine: Awaited<ReturnType<typeof createOnigurumaEngine>>;
let grammar: Awaited<ReturnType<Registry["loadGrammarWithConfiguration"]>>;
let colorMap: string[];
let themeColors: Record<string, string>;

export async function initTokenizer() {
  engine = await createOnigurumaEngine(wasm);
  const onigLib = {
    createOnigScanner: (patterns: (string | RegExp)[]) =>
      engine.createScanner(patterns),
    createOnigString: (s: string) => engine.createString(s),
  };

  const themeData = slackDark as ThemeRegistration;

  const registry = new Registry({
    onigLib,
    loadGrammar(scopeName: string) {
      return langs[0];
    },
  });
  registry.setTheme(themeData as IRawTheme);

  grammar = registry.loadGrammarWithConfiguration(langs[0].scopeName, 1, {
    balancedBracketSelectors: langs[0].balancedBracketSelectors || ["*"],
    unbalancedBracketSelectors: langs[0].unbalancedBracketSelectors || [],
  })!;
  colorMap = registry.getColorMap();
  themeColors = (themeData as any).colors || {};
}

await initTokenizer();
export function tokenize(code: string) {
  if (!grammar) {
    return {
      tokens: [[]],
      bg: "",
      fg: "",
      rootStyle: undefined,
    };
  }

  if (code.length === 0)
    return { tokens: [[]], bg: "", fg: "", rootStyle: undefined };
  const parts = code.split(/(\r?\n)/g);
  let index = 0;
  const lines: [string, number][] = [];
  for (let i = 0; i < parts.length; i += 2) {
    lines.push([parts[i], index]);
    index += parts[i].length;
    index += parts[i + 1]?.length || 0;
  }

  let stateStack = INITIAL;

  const final = [];
  for (let i = 0, len = lines.length; i < len; i++) {
    const [line, lineOffset] = lines[i];
    if (line === "") {
      final.push([]);
      continue;
    }

    const actual = [];
    const result = grammar.tokenizeLine2(line, stateStack, 500);
    for (let j = 0; j < result.tokens.length / 2; j++) {
      const startIndex = result.tokens[2 * j];
      const nextStartIndex =
        j + 1 < result.tokens.length / 2
          ? result.tokens[2 * j + 2]
          : line.length;
      if (startIndex === nextStartIndex) continue;
      const metadata = result.tokens[2 * j + 1];
      const fg = colorMap[EncodedTokenMetadata.getForeground(metadata)];
      actual.push({
        content: line.substring(startIndex, nextStartIndex),
        offset: lineOffset + startIndex,
        color: fg,
        bgColor:
          colorMap[EncodedTokenMetadata.getBackground(metadata)] || undefined,
        fontStyle: EncodedTokenMetadata.getFontStyle(metadata),
        htmlStyle: {},
        htmlAttrs: {},
      });
    }
    final.push(actual);
    stateStack = result.ruleStack;
  }

  return {
    tokens: final,
    bg: themeColors?.["editor.background"] || "",
    fg: themeColors?.["editor.foreground"] || "",
    rootStyle: undefined,
    stateStack,
  };
}
