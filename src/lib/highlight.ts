import type { Token } from "src/types";
import type { ParseResult } from "@babel/parser";

// This function takes in the original JS/JSX code, a possibly transformed ast and an array to write tokens to. It returns the rewritten code
// This rewritten code should equal all "token.content"s joined together
export function tokenize(
  code: string | null,
  ast: ParseResult,
  array: Token[][],
): string {}
