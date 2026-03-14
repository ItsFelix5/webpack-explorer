import jsTokens from "js-tokens";

const keywords = new Set([
  "break", "case", "catch", "continue", "debugger", "default", "delete",
  "do", "else", "export", "extends", "finally", "for", "function", "if",
  "import", "in", "instanceof", "new", "return", "super", "switch", "this",
  "throw", "try", "typeof", "var", "void", "while", "with", "yield",
  "let", "const", "class", "static", "async", "await", "of", "from", "as",
  "get", "set", "target", "meta",
]);

const builtins = new Set([
  "undefined", "null", "true", "false", "NaN", "Infinity",
  "Object", "Array", "Function", "String", "Number", "Boolean", "Symbol",
  "BigInt", "RegExp", "Date", "Map", "Set", "WeakMap", "WeakSet", "WeakRef",
  "Promise", "Proxy", "Reflect", "Error", "TypeError", "RangeError",
  "SyntaxError", "ReferenceError", "EvalError", "URIError",
  "Math", "JSON", "console", "parseInt", "parseFloat", "isNaN", "isFinite",
  "encodeURIComponent", "decodeURIComponent", "encodeURI", "decodeURI",
  "eval", "globalThis", "self", "window", "document", "module", "exports",
  "require", "arguments", "prototype", "__proto__",
]);

export interface HighlightSpan {
  cls: string;
  text: string;
}

export function highlight(code: string): HighlightSpan[] {
  const spans: HighlightSpan[] = [];

  for (const token of jsTokens(code)) {
    let cls: string;

    switch (token.type) {
      case "StringLiteral":
      case "NoSubstitutionTemplate":
      case "TemplateHead":
      case "TemplateMiddle":
      case "TemplateTail":
        cls = "hl-string";
        break;

      case "RegularExpressionLiteral":
        cls = "hl-regex";
        break;

      case "SingleLineComment":
      case "MultiLineComment":
      case "HashbangComment":
        cls = "hl-comment";
        break;

      case "NumericLiteral":
        cls = "hl-number";
        break;

      case "IdentifierName":
        if (keywords.has(token.value)) {
          cls = "hl-keyword";
        } else if (builtins.has(token.value)) {
          cls = "hl-builtin";
        } else {
          cls = "hl-ident";
        }
        break;

      case "Punctuator":
        cls = "hl-punct";
        break;

      case "WhiteSpace":
      case "LineTerminatorSequence":
        cls = "";
        break;

      default:
        cls = "";
        break;
    }

    spans.push({ cls, text: token.value });
  }

  return spans;
}

export function spansToLines(spans: HighlightSpan[]): HighlightSpan[][] {
  const lines: HighlightSpan[][] = [[]];

  for (const span of spans) {
    const parts = span.text.split(/(\r\n|\r|\n)/);
    for (let i = 0; i < parts.length; i++) {
      if (i > 0 && (parts[i] === "\n" || parts[i] === "\r\n" || parts[i] === "\r")) {
        lines.push([]);
        continue;
      }
      if (parts[i].length > 0) {
        lines[lines.length - 1].push({ cls: span.cls, text: parts[i] });
      }
    }
  }

  return lines;
}
