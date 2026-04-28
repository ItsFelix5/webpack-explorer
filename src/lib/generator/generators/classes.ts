import type Printer from "../printer.ts";
import {
  isExportDefaultDeclaration,
  isExportNamedDeclaration,
} from "@babel/types";
import type * as t from "@babel/types";

import { _shouldPrintDecoratorsBeforeExport } from "./expressions";
import { _tsPrintClassMemberModifiers } from "./typescript";
import { _variance } from "./flow";
import { _methodHead } from "./methods";

export function ClassDeclaration(
  this: Printer,
  node: t.ClassDeclaration,
  parent: t.Node,
) {
  const inExport =
    isExportDefaultDeclaration(parent) || isExportNamedDeclaration(parent);

  if (
    !inExport ||
    !_shouldPrintDecoratorsBeforeExport.call(
      this,
      parent as t.ExportDeclaration & { declaration: t.ClassDeclaration },
    )
  ) {
    this.printJoin(node.decorators);
  }

  if (node.declare) {
    // TS
    this.word("declare");
    this.space();
  }

  if (node.abstract) {
    // TS
    this.word("abstract");
    this.space();
  }

  this.word("class");

  if (node.id) {
    this.space();
    this.print(node.id, false, false, undefined, { type: "class" });
  }

  this.print(node.typeParameters);

  if (node.superClass) {
    this.space();
    this.word("extends");
    this.space();
    this.print(node.superClass);
    this.print(node.superTypeArguments);
  }

  if (node.implements) {
    this.space();
    this.word("implements");
    this.space();
    this.printList(node.implements);
  }

  this.space();
  this.print(node.body);
}

export { ClassDeclaration as ClassExpression };

export function ClassBody(this: Printer, node: t.ClassBody) {
  this.token("{", "bracket");
  if (node.body.length === 0) this.token("}", "bracket");
  else {
    this.scopeStack.push({});
    const oldNoLineTerminatorAfterNode = this.enterDelimited();
    this.printJoin(node.body, true, true, null, true, true);
    this._noLineTerminatorAfterNode = oldNoLineTerminatorAfterNode;

    if (!this.endsWith(10)) this.newline();

    this.scopeStack.pop();
    this.rightBrace(node);
  }
}
export function ClassProperty(this: Printer, node: t.ClassProperty) {
  this.printJoin(node.decorators);

  _tsPrintClassMemberModifiers.call(this, node);

  if (node.computed) {
    this.token("[", "bracket");
    this.print(node.key);
    this.token("]", "bracket");
  } else {
    _variance.call(this, node);
    this.print(node.key);
  }

  // TS
  if (node.optional) {
    this.token("?", "punctuation");
  }
  if (node.definite) {
    this.token("!", "punctuation");
  }

  this.print(node.typeAnnotation);
  if (node.value) {
    this.space();
    this.token("=", "operator");
    this.space();
    this.print(node.value);
  }
  this.semicolon();
}

export function ClassAccessorProperty(
  this: Printer,
  node: t.ClassAccessorProperty,
) {
  this.printJoin(node.decorators);

  // TS does not support class accessor property yet
  _tsPrintClassMemberModifiers.call(this, node);

  this.word("accessor", "keyword", true);
  this.space();

  if (node.computed) {
    this.token("[", "bracket");
    this.print(node.key);
    this.token("]", "bracket");
  } else {
    // Todo: Flow does not support class accessor property yet.
    _variance.call(this, node);
    this.print(node.key);
  }

  // TS
  if (node.optional) {
    this.token("?", "punctuation");
  }
  if (node.definite) {
    this.token("!", "punctuation");
  }

  this.print(node.typeAnnotation);
  if (node.value) {
    this.space();
    this.token("=", "operator");
    this.space();
    this.print(node.value);
  }
  this.semicolon();
}

export function ClassPrivateProperty(
  this: Printer,
  node: t.ClassPrivateProperty,
) {
  this.printJoin(node.decorators);
  _tsPrintClassMemberModifiers.call(this, node);
  this.print(node.key);
  // TS
  if (node.optional) {
    this.token("?", "punctuation");
  }
  if (node.definite) {
    this.token("!", "punctuation");
  }
  this.print(node.typeAnnotation);
  if (node.value) {
    this.space();
    this.token("=", "operator");
    this.space();
    this.print(node.value);
  }
  this.semicolon();
}

export function ClassMethod(this: Printer, node: t.ClassMethod) {
  _classMethodHead.call(this, node);
  this.space();
  this.print(node.body);
}

export function ClassPrivateMethod(this: Printer, node: t.ClassPrivateMethod) {
  _classMethodHead.call(this, node);
  this.space();
  this.print(node.body);
}

export function _classMethodHead(
  this: Printer,
  node: t.ClassMethod | t.ClassPrivateMethod | t.TSDeclareMethod,
  allowDecorators = true,
) {
  if (allowDecorators) {
    this.printJoin((node as t.ClassMethod | t.ClassPrivateMethod).decorators);
  }

  _tsPrintClassMemberModifiers.call(this, node);
  _methodHead.call(this, node);
}

export function StaticBlock(this: Printer, node: t.StaticBlock) {
  this.word("static");
  this.space();
  this.token("{", "bracket");
  if (node.body.length === 0) {
    this.token("}", "bracket");
  } else {
    this.newline();
    this.printSequence(node.body, true);
    this.rightBrace(node);
  }
}
