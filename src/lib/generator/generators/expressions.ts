import type Printer from "../printer";
import { isLiteral, isMemberExpression, isPattern } from "@babel/types";
import * as t from "@babel/types";
import { TokenContext } from "../node";
import type { Token } from "src/types";

export function UnaryExpression(this: Printer, node: t.UnaryExpression) {
  const { operator } = node;
  const firstChar = operator.charCodeAt(0);
  if (firstChar >= 97 && firstChar <= 122) {
    this.word(operator, "keyword");
    this.space();
  } else {
    this.tokenChar(firstChar, "operator");
  }

  this.print(node.argument);
}

export function DoExpression(this: Printer, node: t.DoExpression) {
  if (node.async) {
    this.word("async", "keyword", true);
    this.space();
  }
  this.word("do");
  this.space();
  this.print(node.body);
}

export function ParenthesizedExpression(
  this: Printer,
  node: t.ParenthesizedExpression,
) {
  this.token("(", "bracket");
  const oldNoLineTerminatorAfterNode = this.enterDelimited();
  this.print(node.expression, undefined, true);
  this._noLineTerminatorAfterNode = oldNoLineTerminatorAfterNode;
  this.rightParens(node);
}

export function UpdateExpression(this: Printer, node: t.UpdateExpression) {
  if (node.prefix) {
    this.token(node.operator, "", false, true);
    this.print(node.argument);
  } else {
    this.print(node.argument, true);
    this.token(node.operator, "", false, true);
  }
}

export function ConditionalExpression(
  this: Printer,
  node: t.ConditionalExpression,
) {
  this.print(node.test);
  this.space();
  this.token("?", "keyword");
  this.space();
  this.print(node.consequent);
  this.space();
  this.token(":", "keyword");
  this.space();
  this.print(node.alternate);
}

function _printExpressionArguments(
  this: Printer,
  node: t.CallExpression | t.NewExpression | t.OptionalCallExpression,
) {
  this.token("(", "bracket");
  const oldNoLineTerminatorAfterNode = this.enterDelimited();
  this.printList(node.arguments, null, undefined, undefined, undefined, true);
  this._noLineTerminatorAfterNode = oldNoLineTerminatorAfterNode;
  this.rightParens(node);
}

export function NewExpression(
  this: Printer,
  node: t.NewExpression,
  parent: t.Node,
) {
  this.word("new");
  this.space();
  this.print(node.callee);

  this.print(node.typeArguments);

  _printExpressionArguments.call(this, node);
}

export function SequenceExpression(this: Printer, node: t.SequenceExpression) {
  this.printList(node.expressions);
}

export function ThisExpression(this: Printer) {
  this.word("this");
}

export function Super(this: Printer) {
  this.word("super");
}

export function _shouldPrintDecoratorsBeforeExport(
  this: Printer,
  node: t.ExportDeclaration & { declaration: t.ClassDeclaration },
) {
  return (
    typeof node.start === "number" && node.start === node.declaration.start
  );
}

export function Decorator(this: Printer, node: t.Decorator) {
  this.token("@");
  const { expression } = node;
  this.print(expression);
  this.newline();
}

export function OptionalMemberExpression(
  this: Printer,
  node: t.OptionalMemberExpression,
) {
  let { computed } = node;
  const { optional, property } = node;

  this.print(node.object);

  if (!computed && isMemberExpression(property))
    throw new TypeError("Got a MemberExpression for MemberExpression property");

  // @ts-expect-error todo(flow->ts) maybe instead of typeof check specific literal types?
  if (isLiteral(property) && typeof property.value === "number")
    computed = true;
  if (optional) this.token("?.", "punctuation");

  if (computed) {
    this.token("[", "bracket");
    this.print(property);
    this.token("]", "bracket");
  } else {
    if (!optional) this.token(".", "punctuation");
    this.validVariableSpot = false;
    this.print(property);
    this.validVariableSpot = true;
  }
}

export function OptionalCallExpression(
  this: Printer,
  node: t.OptionalCallExpression,
) {
  this.print(node.callee, false, false, undefined, { type: "function" });

  if (node.optional) this.token("?.", "punctuation");

  this.print(node.typeArguments);

  _printExpressionArguments.call(this, node);
}

export function CallExpression(this: Printer, node: t.CallExpression) {
  this.print(node.callee, false, false, undefined, { type: "function" });
  this.print(node.typeArguments);
  _printExpressionArguments.call(this, node);
}

export function Import(this: Printer) {
  this.word("import");
}

export function AwaitExpression(this: Printer, node: t.AwaitExpression) {
  this.word("await");
  this.space();
  this.print(node.argument);
}

export function YieldExpression(this: Printer, node: t.YieldExpression) {
  if (node.delegate) {
    this.word("yield", "keyword", true);
    this.token("*", "keyword");
    if (node.argument) {
      this.space();
      // line terminators are allowed after yield*
      this.print(node.argument);
    }
  } else if (node.argument) {
    this.word("yield", "keyword", true);
    this.space();
    this.print(node.argument);
  } else {
    this.word("yield");
  }
}

export function ExpressionStatement(
  this: Printer,
  node: t.ExpressionStatement,
) {
  this.tokenContext |= TokenContext.expressionStatement;
  this.print(node.expression);
  this.semicolon();
}

export function AssignmentPattern(this: Printer, node: t.AssignmentPattern) {
  this.print(node.left);
  if (node.left.type === "Identifier" || isPattern(node.left)) {
    if (node.left.optional) this.token("?", "punctuation");
    this.print(node.left.typeAnnotation);
  }
  this.space();
  this.token("=", "operator");
  this.space();
  this.print(node.right);
}

export function AssignmentExpression(
  this: Printer,
  node: t.AssignmentExpression | t.LogicalExpression,
) {
  this.print(node.left);

  this.space();
  this.token(node.operator, "operator", false, true);
  this.space();

  this.print(node.right);
}

export { AssignmentExpression as LogicalExpression };

export function BinaryExpression(this: Printer, node: t.BinaryExpression) {
  this.print(node.left);

  this.space();
  const { operator } = node;
  if (operator.charCodeAt(0) === 105) {
    this.word(operator, "operator");
  } else {
    this.token(operator, "operator", false, true);
    this.last = operator.charCodeAt(operator.length - 1);
  }
  this.space();

  this.print(node.right);
}

export function BindExpression(this: Printer, node: t.BindExpression) {
  this.print(node.object);
  this.token("::", "punctuation");
  this.print(node.callee);
}

export function MemberExpression(
  this: Printer,
  node: t.MemberExpression,
  parent: t.MemberExpression,
  overrides?: Partial<Token>,
) {
  this.print(node.object);

  if (!node.computed && isMemberExpression(node.property))
    throw new TypeError("Got a MemberExpression for MemberExpression property");

  let computed = node.computed;
  // @ts-expect-error todo(flow->ts) maybe use specific literal types
  if (isLiteral(node.property) && typeof node.property.value === "number")
    computed = true;

  if (computed) {
    const oldNoLineTerminatorAfterNode = this.enterDelimited();
    this.token("[", "bracket");
    this.print(node.property, undefined, true, undefined, overrides);
    this.token("]", "bracket");
    this._noLineTerminatorAfterNode = oldNoLineTerminatorAfterNode;
  } else {
    this.token(".", "punctuation");
    this.validVariableSpot = false;
    this.print(node.property, false, false, undefined, overrides);
    this.validVariableSpot = true;
  }
}

export function MetaProperty(this: Printer, node: t.MetaProperty) {
  this.print(node.meta);
  this.token(".", "bracket");
  this.print(node.property);
}

export function PrivateName(this: Printer, node: t.PrivateName) {
  this.token("#");
  this.print(node.id);
}

export function V8IntrinsicIdentifier(
  this: Printer,
  node: t.V8IntrinsicIdentifier,
) {
  this.token("%", "operator");
  this.word(node.name);
}

export function ModuleExpression(this: Printer, node: t.ModuleExpression) {
  this.word("module", "keyword", true);
  this.space();
  this.token("{", "bracket");
  this.indent++;
  const { body } = node;
  if (body.body.length || body.directives.length) {
    this.newline();
  }
  this.print(body);
  this.indent--;
  this.rightBrace(node);
}
