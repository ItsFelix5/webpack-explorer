import type Printer from "../printer";
import { isAssignmentPattern, isIdentifier } from "@babel/types";
import * as t from "@babel/types";
import jsesc from "jsesc";
import { _methodHead } from "./methods";
import type { Token } from "src/types";

export function Identifier(
  this: Printer,
  node: t.Identifier,
  parent: t.Identifier,
  type: Token["type"],
) {
  if (this._map)
    this.sourceIdentifierName(node.loc?.identifierName || node.name);

  this.word(node.name, type ?? "variable");
}

export function ArgumentPlaceholder(this: Printer) {
  this.token("?");
}

export function RestElement(this: Printer, node: t.RestElement) {
  this.token("...");
  this.print(node.argument);
}

export { RestElement as SpreadElement };

export function ObjectExpression(this: Printer, node: t.ObjectExpression) {
  const props = node.properties;

  this.token("{");

  if (props.length) {
    const oldNoLineTerminatorAfterNode = this.enterDelimited();
    this.space();
    this.printList(props, null, true, true, undefined, true);
    this.space();
    this._noLineTerminatorAfterNode = oldNoLineTerminatorAfterNode;
  }

  this.rightBrace(node);
}

export { ObjectExpression as ObjectPattern };

export function ObjectMethod(this: Printer, node: t.ObjectMethod) {
  this.printJoin(node.decorators);
  _methodHead.call(this, node);
  this.space();
  this.print(node.body);
}

export function ObjectProperty(this: Printer, node: t.ObjectProperty) {
  this.printJoin(node.decorators);

  if (node.computed) {
    this.token("[");
    this.print(node.key);
    this.token("]");
  } else {
    // print `({ foo: foo = 5 } = {})` as `({ foo = 5 } = {});`
    if (
      isAssignmentPattern(node.value) &&
      isIdentifier(node.key) &&
      // @ts-expect-error todo(flow->ts) `.name` does not exist on some types in union
      node.key.name === node.value.left.name
    ) {
      this.print(node.value);
      return;
    }

    this.print(node.key);

    // shorthand!
    if (
      node.shorthand &&
      isIdentifier(node.key) &&
      isIdentifier(node.value) &&
      node.key.name === node.value.name
    ) {
      return;
    }
  }

  this.token(":");
  this.space();
  this.print(node.value);
}

export function ArrayExpression(this: Printer, node: t.ArrayExpression) {
  const elems = node.elements;
  const len = elems.length;

  this.token("[");

  const oldNoLineTerminatorAfterNode = this.enterDelimited();

  for (let i = 0; i < elems.length; i++) {
    const elem = elems[i];
    if (elem) {
      if (i > 0) this.space();
      this.print(elem, undefined, true);
      if (i < len - 1) {
        this.tokenChar(44, "punctuation");
      }
    } else {
      // If the array expression ends with a hole, that hole
      // will be ignored by the interpreter, but if it ends with
      // two (or more) holes, we need to write out two (or more)
      // commas so that the resulting code is interpreted with
      // both (all) of the holes.
      this.tokenChar(44, "punctuation");
    }
  }

  this._noLineTerminatorAfterNode = oldNoLineTerminatorAfterNode;

  this.token("]");
}

export { ArrayExpression as ArrayPattern };

export function RegExpLiteral(this: Printer, node: t.RegExpLiteral) {
  this.word(`/${node.pattern}/${node.flags}`, "regex", false);
}

export function BooleanLiteral(this: Printer, node: t.BooleanLiteral) {
  this.word(node.value ? "true" : "false", "boolean");
}

export function NullLiteral(this: Printer) {
  this.word("null", "builtin");
}

export function NumericLiteral(this: Printer, node: t.NumericLiteral) {
  const str = this.getPossibleRaw(node) ?? node.value + "";
  this.word(str, "number");

  // Integer tokens need special handling because they cannot have '.'s inserted immediately after them.
  if (
    Number.isInteger(node.value) &&
    !/^(0[box]|.*[eE].*|.*\.0+|.*\.)$/.test(str)
  )
    this.setLastChar(-2);
}

export function StringLiteral(this: Printer, node: t.StringLiteral) {
  const raw = this.getPossibleRaw(node);
  if (raw !== undefined) {
    this.token(raw, "string");
    return;
  }

  const val = jsesc(node.value, {
    quotes: "double",
    wrap: true,
    minimal: true,
  });

  this.token(val, "string");
}

export function TaggedTemplateExpression(
  this: Printer,
  node: t.TaggedTemplateExpression,
) {
  this.print(node.tag);
  this.print(node.typeArguments);
  this.print(node.quasi);
}

export type TemplateLiteralBase = t.Node & {
  quasis: t.TemplateElement[];
};

export function _printTemplate<T extends t.Node>(
  this: Printer,
  node: TemplateLiteralBase,
  substitutions: T[],
) {
  const quasis = node.quasis;
  this.token("`", "string");
  for (let i = 0; i < quasis.length - 1; i++) {
    this.token(quasis[i].value.raw, "string", true);
    this.token("${", "keyword");
    this.print(substitutions[i]);
    this.token("}", "keyword");
  }

  this.token(quasis[quasis.length - 1].value.raw, "string");
  this.token("`", "string");
}

export function TemplateLiteral(this: Printer, node: t.TemplateLiteral) {
  _printTemplate.call(this, node, node.expressions);
}

export function BigIntLiteral(this: Printer, node: t.BigIntLiteral) {
  this.word(this.getPossibleRaw(node) ?? node.value + "n", "number");
}

export function VoidPattern(this: Printer) {
  this.word("void");
}
