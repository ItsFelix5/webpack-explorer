import type { Token } from "src/types";
import type { ParseResult } from "@babel/parser";
import Printer from "./generator/printer";

export function tokenize(
  code: string | null,
  ast: ParseResult,
  array: Token[][],
): string {
  //const map = new GenMapping()
  //setSourceContent(map, "", code);
  const printer = new Printer(null);
  printer.print(ast);
  if (printer._queuedChar !== 32) printer._flush();

  array.push(...printer._tokens);
  return printer._str;
}
