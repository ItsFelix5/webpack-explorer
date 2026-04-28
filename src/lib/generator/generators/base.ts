import type Printer from "../printer";
import type * as t from "@babel/types";

export function File(this: Printer, node: t.File) {
  this.print(node.program);
}

export function Program(this: Printer, node: t.Program) {
  // An empty Program doesn't have any inner tokens, so
  // we must explicitly print its inner comments.
  this.printInnerComments(false);

  const directivesLen = node.directives?.length;
  if (directivesLen) {
    const newline = node.body.length ? 2 : 1;
    this.printSequence(node.directives, undefined, undefined, newline);
    if (!node.directives[directivesLen - 1].trailingComments?.length) {
      this.newline(newline);
    }
  }

  this.printSequence(node.body);
}

export function BlockStatement(this: Printer, node: t.BlockStatement) {
  this.token("{", "bracket");
  const oldNoLineTerminatorAfterNode = this.enterDelimited();

  const directivesLen = node.directives?.length;
  if (directivesLen) {
    const newline = node.body.length ? 2 : 1;
    this.printSequence(node.directives, true, true, newline);
    if (!node.directives[directivesLen - 1].trailingComments?.length)
      this.newline(newline);
  }

  this.scopeStack.push({});
  this.printSequence(node.body, true, true);
  this.scopeStack.pop();

  this._noLineTerminatorAfterNode = oldNoLineTerminatorAfterNode;
  this.rightBrace(node);
}

export function Directive(this: Printer, node: t.Directive) {
  this.print(node.value);
  this.semicolon();
}

export function DirectiveLiteral(this: Printer, node: t.DirectiveLiteral) {
  const raw = this.getPossibleRaw(node);
  if (raw !== undefined) {
    this.token(raw, "string");
    return;
  }

  const { value } = node;

  // NOTE: In directives we can't change escapings,
  // because they change the behavior.
  // e.g. "us\x65 strict" (\x65 is e) is not a "use strict" directive.

  if (!/(?:^|[^\\])(?:\\\\)*"/.test(value)) this.token(`"${value}"`, "string");
  else if (!/(?:^|[^\\])(?:\\\\)*'/.test(value))
    this.token(`'${value}'`, "string");
  else
    throw new Error(
      "Malformed AST: it is not possible to print a directive containing" +
        " both unescaped single and double quotes.",
    );
}
