import type { Token, TokenType } from "./types";

const KEYWORDS = new Set([
  "break",
  "case",
  "catch",
  "class",
  "const",
  "continue",
  "debugger",
  "default",
  "delete",
  "do",
  "else",
  "export",
  "extends",
  "finally",
  "for",
  "function",
  "if",
  "import",
  "in",
  "instanceof",
  "let",
  "new",
  "of",
  "return",
  "static",
  "super",
  "switch",
  "this",
  "throw",
  "try",
  "typeof",
  "var",
  "void",
  "while",
  "with",
  "yield",
  "async",
  "await",
  "from",
  "as",
  "get",
  "set",
  "true",
  "false",
  "null",
  "undefined",
]);

const RULES: [TokenType, RegExp][] = [
  ["comment", /^\/\/[^\n]*/],
  ["comment", /^\/\*[\s\S]*?\*\//],
  ["string", /^`(?:[^`\\]|\\.|\$\{(?:[^{}]|\{[^{}]*\})*\})*`/],
  ["string", /^"(?:[^"\\]|\\.)*"/],
  ["string", /^'(?:[^'\\]|\\.)*'/],
  ["regex", /^\/(?!\/)(?:[^/\\\n[]|\\.|\[(?:[^\]\\\n]|\\.)*\])+\/[gimsuy]*/],
  [
    "number",
    /^(?:0x[\da-fA-F]+|0o[0-7]+|0b[01]+|\d+(?:\.\d+)?(?:[eE][+-]?\d+)?)/,
  ],
  ["keyword", /^[a-zA-Z_$][a-zA-Z0-9_$]*/],
  ["property", /^(?<=\.)[a-zA-Z_$][a-zA-Z0-9_$]*/],
  [
    "operator",
    /^(?:===|!==|==|!=|=>|<<|>>|>>>|\|\||&&|\?\?|[+\-*/%&|^~<>!]=?|[?:=])/,
  ],
  ["punctuation", /^[{}[\]();,.]/],
  ["plain", /^[\s]+/],
  ["plain", /^./],
];

const REGEX_ALLOWED_BEFORE = new Set([
  "=",
  "(",
  "[",
  "{",
  "!",
  "&",
  "|",
  "?",
  ":",
  ";",
  ",",
  "return",
  "typeof",
  "instanceof",
  "in",
  "of",
  "new",
  "delete",
  "void",
  "throw",
  "=>",
  "&&",
  "||",
  "??",
]);

export function tokenize(code: string): Token[] {
  const tokens: Token[] = [];
  let pos = 0;
  let lastMeaningful = "";

  while (pos < code.length) {
    const slice = code.slice(pos);
    let matched = false;

    for (const [type, rx] of RULES) {
      if (type === "regex") {
        if (!REGEX_ALLOWED_BEFORE.has(lastMeaningful)) continue;
      }

      const m = rx.exec(slice);
      if (!m) continue;

      let tokenType = type;

      if (type === "keyword") {
        const word = m[0];
        if (!KEYWORDS.has(word)) {
          const peek = code.slice(pos + word.length).trimStart();
          tokenType = peek.startsWith("(")
            ? "identifier"
            : peek.startsWith(":")
              ? "identifier"
              : "identifier";
        }
      }

      tokens.push({ type: tokenType, value: m[0] });

      if (type !== "plain" || m[0].trim() !== "") {
        lastMeaningful = m[0];
      }

      pos += m[0].length;
      matched = true;
      break;
    }

    if (!matched) {
      tokens.push({ type: "plain", value: code[pos] });
      pos++;
    }
  }

  return tokens;
}

export function tokensToHtml(tokens: Token[]): string {
  return tokens
    .map((t) => {
      const escaped = t.value
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;");
      if (t.type === "plain") return escaped;
      return `<span class="tok-${t.type}">${escaped}</span>`;
    })
    .join("");
}
