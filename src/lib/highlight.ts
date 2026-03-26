import { createHighlighterCore } from "shiki/core";
import { createOnigurumaEngine } from "shiki";
import wasm from "shiki/wasm";
import { EncodedTokenMetadata, INITIAL, Registry } from "shiki/textmate";
import themes from "./themes";
import type { ThemeName, Token } from "src/types";

////////////////////
// const langs = [import("@shikijs/langs-precompiled/jsx")];
// const _registry = new Registry(
//   new Resolver(options.engine, langs),
//   [],
//   langs,
//   options.langAlias,
// );
// let _lastTheme;
// function getLanguage(name) {
//   const _lang = _registry.getGrammar(
//     typeof name === "string" ? name : name.name,
//   );
//   if (!_lang)
//     throw new ShikiError(
//       `Language \`${name}\` not found, you may need to load it first`,
//     );
//   return _lang;
// }
// function getTheme(name) {
//   if (name === "none")
//     return {
//       bg: "",
//       fg: "",
//       name: "none",
//       settings: [],
//       type: "dark",
//     };

//   const _theme = _registry.getTheme(name);
//   if (!_theme)
//     throw new ShikiError(
//       `Theme \`${name}\` not found, you may need to load it first`,
//     );
//   return _theme;
// }
// function setTheme(name) {
//   const theme = getTheme(name);
//   if (_lastTheme !== name) {
//     _registry.setTheme(theme);
//     _lastTheme = name;
//   }
//   return {
//     theme,
//     colorMap: _registry.getColorMap(),
//   };
// }
// async function loadTheme(theme) {
//   _registry.loadTheme(await resolveThemes(theme));
// }
//////////////////

export const highlighter = await createHighlighterCore({
  langs: [import("@shikijs/langs-precompiled/jsx")],
  engine: createOnigurumaEngine(wasm),
});
////////////////

// import oniguruma from "vscode-oniguruma";
// import vsctm from "vscode-textmate";

// const wasmBin = fs.readFileSync(
//   path.join(__dirname, "./node_modules/vscode-oniguruma/release/onig.wasm"),
// ).buffer;
// const vscodeOnigurumaLib = oniguruma.loadWASM(wasmBin).then(() => {
//   return {
//     createOnigScanner(patterns) {
//       return new oniguruma.OnigScanner(patterns);
//     },
//     createOnigString(s) {
//       return new oniguruma.OnigString(s);
//     },
//   };
// });

// // Create a registry that can create a grammar from a scope name.
// const registry = new vsctm.Registry({
//   onigLib: vscodeOnigurumaLib,
//   loadGrammar: (scopeName) => {
//     if (scopeName === "source.js") {
//       // https://github.com/textmate/javascript.tmbundle/blob/master/Syntaxes/JavaScript.plist
//       return readFile("./JavaScript.plist").then((data) =>
//         vsctm.parseRawGrammar(data.toString()),
//       );
//     }
//     console.log(`Unknown scope name: ${scopeName}`);
//     return null;
//   },
// });

//
const bracketPairs = [
  {
    opener: "[",
    closer: "]",
  },
  {
    opener: "{",
    closer: "}",
  },
  {
    opener: "(",
    closer: ")",
  },
  {
    opener: "<",
    closer: ">",
    scopesAllowList: [
      "punctuation.definition.typeparameters.begin.ts",
      "punctuation.definition.typeparameters.end.ts",
      "entity.name.type.instance.jsdoc",
    ],
  },
];
const bracketsRegExp = new RegExp(
  bracketPairs
    .flatMap((pair) => [pair.opener, pair.closer])
    .sort((a, b) => b.length - a.length)
    .map((s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"))
    .join("|"),
  "g",
);

export function tokenize(code: string, theme: ThemeName, array: Token[][]) {
  const { colorMap } = highlighter.setTheme(theme);
  const { bracketColors } = themes[theme];
  const grammar = highlighter.getLanguage("jsx");

  const openerStack: Token[] = [];
  const parts = code.split(/(\r?\n)/g);
  let lineOffset = 0;
  let stateStack = INITIAL;
  for (let i = 0; i < parts.length; i += 2) {
    lineOffset += parts[i - 2]?.length || 0;
    lineOffset += parts[i - 1]?.length || 0;
    const line = parts[i];
    if (line === "") {
      array.push([]);
      continue;
    }

    let startOfLine = true;
    let lineTokens = [];
    const scopes = grammar.tokenizeLine(line, stateStack, 500).tokens;
    const result = grammar.tokenizeLine2(line, stateStack, 500);
    const tokensLength = result.tokens.length / 2;
    for (let j = 0; j < tokensLength; j++) {
      let startIndex = result.tokens[2 * j];
      const nextStartIndex =
        j + 1 < tokensLength ? result.tokens[2 * j + 2] : line.length;
      if (startIndex === nextStartIndex) continue;
      const metadata = result.tokens[2 * j + 1];

      const fontStyle = EncodedTokenMetadata.getFontStyle(metadata);
      let style = "";
      if (fontStyle & 1) style += "font-style: italic;";
      if (fontStyle & 2) style += "font-weight: bold;";
      if (fontStyle & 4 || fontStyle & 8) {
        style += "text-decoration: ";
        if (fontStyle & 4) style += "underline ";
        if (fontStyle & 8) style += "line-through";
        style += ";";
      }
      let content = line.substring(startIndex, nextStartIndex);
      while (content.startsWith(" ")) {
        let length = startOfLine
          ? content.startsWith("  ")
            ? 2
            : 1
          : content.match(/^ +/)![0].length;
        lineTokens.push({
          content: content.substring(0, length),
          offset: lineOffset + startIndex,
          color: colorMap[EncodedTokenMetadata.getForeground(metadata)],
          htmlAttrs: { class: startOfLine ? "indent" : undefined },
        });
        startIndex += length;
        content = content.substring(length);
      }
      startOfLine = false;

      if (content.length) {
        const explanations = scopes
          .filter(
            (scopeToken) =>
              scopeToken.endIndex > startIndex &&
              scopeToken.startIndex < nextStartIndex,
          )
          .map((scopeToken) => ({
            content: line.substring(
              Math.max(scopeToken.startIndex, startIndex),
              Math.min(scopeToken.endIndex, nextStartIndex),
            ),
            scopes: scopeToken.scopes,
          }));

        const offset = lineOffset + startIndex;

        let trailing = content;
        content = content.trimEnd();
        trailing = trailing.substring(content.length);

        const t = {
          content,
          offset,
          color: colorMap[EncodedTokenMetadata.getForeground(metadata)],
          htmlAttrs: { style },
          explanation: explanations,
        };

        if (shouldIgnoreToken(t)) {
          lineTokens.push(t);
          if (trailing)
            lineTokens.push({
              content: trailing,
              offset: offset + content.length,
              color: "",
              htmlAttrs: {},
            });
          continue;
        }

        const tokens: Token[] = [];

        let last = 0,
          m: RegExpExecArray | null;

        while ((m = bracketsRegExp.exec(content))) {
          if (m.index > last)
            tokens.push({
              ...t,
              content: content.slice(last, m.index),
              offset: offset + last,
            });

          tokens.push({ ...t, content: m[0], offset: offset + m.index });
          last = m.index + m[0].length;
        }

        if (last < content.length)
          tokens.push({
            ...t,
            content: content.slice(last),
            offset: offset + last,
          });

        const lead = content.match(/^\s*/)?.[0].length ?? 0;
        const trail = content.match(/\s*$/)?.[0].length ?? 0;

        let cur = 0;
        const ranges = explanations.map((e, i) => {
          let len = e.content.length;

          if (explanations.length === 1) len = content.length;
          else if (i === 0) len = lead + e.content.trimStart().length;
          else if (i === explanations.length - 1)
            len = e.content.trimEnd().length + trail;

          const start = cur,
            end = start + len - 1;
          cur += len;
          return { start, end };
        });

        for (const t of tokens) {
          const start = t.offset - offset;
          const end = start + t.content.length - 1;

          t.explanation = ranges
            .map((r, i) => [r, explanations[i]] as const)
            .filter(([r]) => !(end < r.start || r.end < start))
            .map(([, exp]) => exp);
          lineTokens.push(t);
          if (trailing)
            lineTokens.push({
              content: trailing,
              offset: offset + content.length,
              color: "",
              htmlAttrs: {},
            });
          const pairDefinition = bracketPairs.find(
            (pair) =>
              pair.opener === t.content.trim() ||
              pair.closer === t.content.trim(),
          );

          if (
            !pairDefinition ||
            shouldIgnoreToken(t, pairDefinition.scopesAllowList)
          )
            continue;

          if (
            bracketPairs.map((pair) => pair.opener).includes(t.content.trim())
          )
            openerStack.push(t);
          else if (
            bracketPairs.map((pair) => pair.closer).includes(t.content.trim())
          ) {
            const openerContent = bracketPairs.find(
              (pair) => pair.closer == t.content.trim(),
            )?.opener;
            const opener = openerStack
              .toReversed()
              .find((t) => t.content.trim() === openerContent);
            if (opener) {
              while (openerStack.at(-1) !== opener)
                if (openerStack.pop()) t.color = bracketColors.at(-1)!;

              openerStack.pop();
              opener.color = t.color =
                bracketColors[openerStack.length % (bracketColors.length - 1)];
            } else t.color = bracketColors.at(-1)!;
          }
        }
      }
    }
    array.push(lineTokens);
    stateStack = result.ruleStack;
  }

  for (const token of openerStack) token.color = bracketColors.at(-1)!;
}

function shouldIgnoreToken(token: Token, scopesAllowList?: string[]): boolean {
  if (!token.explanation) return true;

  const embeddedLastIndex =
    token.explanation[0].scopes.findLastIndex(
      (scope) =>
        scope.startsWith("meta.embedded.") ||
        scope.startsWith("scope.embedded.") ||
        scope === "entity.name.type.instance.jsdoc" ||
        scope === "variable.other.jsdoc",
    ) ?? -1;
  return !!(
    (token.explanation[0].scopes.findLastIndex(
      (scope) => scope.startsWith("comment.") || scope.startsWith("string."),
    ) ?? -1) > embeddedLastIndex ||
    (scopesAllowList &&
      scopesAllowList.length &&
      !token.explanation.some((explanation) =>
        explanation.scopes.some((scope) =>
          scopesAllowList.some(
            (allowed) => scope === allowed || scope.startsWith(`${allowed}.`),
          ),
        ),
      ))
  );
}
