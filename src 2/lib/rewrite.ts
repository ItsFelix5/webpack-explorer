import { parse } from "@babel/parser";
import traverse from "@babel/traverse";
import generate from "@babel/generator";
import * as t from "@babel/types";
import type { Scope } from "@babel/traverse";

Object.defineProperty(globalThis, "process", {
  configurable: true,
  enumerable: false,
  value: {},
  writable: true,
});

const moduleNameMap: Record<number, string> = {
  0xbad225b5: "React",
};

function preventDestructureRename(pattern: t.ObjectPattern, scope: Scope) {
  pattern.properties.forEach((prop) => {
    if (
      !t.isObjectProperty(prop) ||
      prop.computed ||
      prop.shorthand ||
      !t.isIdentifier(prop.key)
    )
      return;

    const value = t.isAssignmentPattern(prop.value)
      ? prop.value.left
      : prop.value;
    if (!t.isIdentifier(value)) return;

    if (prop.key.name === value.name) {
      prop.shorthand = true;
      return;
    }

    let newName = prop.key.name;
    if (!t.isValidIdentifier(newName)) newName = "_" + newName;
    if (scope.hasGlobal(newName)) return;

    scope.rename(value.name, newName);

    const currentValue = t.isAssignmentPattern(prop.value)
      ? prop.value.left
      : prop.value;
    if (t.isIdentifier(currentValue) && currentValue.name === prop.key.name) {
      prop.value = currentValue;
      prop.shorthand = true;
    } else {
      prop.shorthand = false;
    }
  });
}

export function rewrite(source: string): string {
  const code = /^\s*function\s*\(/.test(source) ? `(${source})` : source;
  const ast = parse(code);

  if (ast.program.body.length !== 1)
    throw new Error("Expected exactly 1 statement");
  const node = ast.program.body[0];

  let fnNode:
    | t.FunctionDeclaration
    | t.FunctionExpression
    | t.ArrowFunctionExpression;

  if (t.isFunctionDeclaration(node)) {
    fnNode = node;
  } else if (t.isExpressionStatement(node)) {
    const { expression } = node;
    if (
      t.isCallExpression(expression) &&
      t.isFunctionExpression(expression.callee)
    )
      fnNode = expression.callee;
    else if (
      t.isFunctionExpression(expression) ||
      t.isArrowFunctionExpression(expression)
    )
      fnNode = expression;
    else throw new Error("Unexpected expression type: " + expression.type);
  } else {
    throw new Error("Unexpected node type: " + (node as t.Node)?.type);
  }

  if (!t.isBlockStatement(fnNode.body))
    throw new Error("Expected function body to be a block statement");
  if (fnNode.params.length > 3) throw new Error("3+ args");

  const counters: Record<string, number> = {};

  traverse(ast, {
    Function(path) {
      path.node.params.forEach((param, i) => {
        if (t.isIdentifier(param))
          path.scope.rename(
            param.name,
            path.node === fnNode
              ? ["module", "exports", "require"][i]
              : "param_" + (counters["param"] = (counters["param"] || 0) + 1),
          );
        else if (t.isObjectPattern(param))
          preventDestructureRename(param, path.scope);
      });
    },

    UnaryExpression(path) {
      const { node } = path;
      if (
        node.operator === "!" &&
        node.argument.type === "NumericLiteral" &&
        (node.argument.value === 0 || node.argument.value === 1)
      ) {
        path.replaceWith(t.booleanLiteral(!!node.argument.value));
      }
    },

    AssignmentExpression({ node, scope }) {
      if (
        t.isMemberExpression(node.left) &&
        !node.left.computed &&
        t.isIdentifier(node.left.property) &&
        node.left.property.name === "displayName" &&
        t.isStringLiteral(node.right) &&
        t.isIdentifier(node.left.object)
      ) {
        let newName = String(node.right.value).replace(/[^A-Za-z0-9_$]/g, "_");
        if (!t.isValidIdentifier(newName)) newName = "_" + newName;
        let base = newName;
        let i = 1;
        while (scope.hasBinding(newName) || scope.hasGlobal(newName))
          newName = `${base}_${i++}`;
        scope.rename(node.left.object.name, newName);
      }
    },

    VariableDeclarator(path) {
      if (t.isObjectPattern(path.node.id)) {
        preventDestructureRename(path.node.id, path.scope);
        return;
      }

      if (!t.isIdentifier(path.node.id) || path.node.id.name.length > 3) return;

      let hint = "val";

      if (
        t.isCallExpression(path.node.init) ||
        t.isNewExpression(path.node.init)
      ) {
        const callee = path.node.init.callee;
        if (t.isIdentifier(callee)) {
          if (
            callee.name === "require" &&
            t.isNumericLiteral(path.node.init.arguments[0])
          )
            hint =
              moduleNameMap[
                (path.node.init.arguments[0] as t.NumericLiteral).value
              ] ||
              "mod_" + (path.node.init.arguments[0] as t.NumericLiteral).value;
          else hint = callee.name.toLowerCase();
        } else if (
          t.isMemberExpression(callee) &&
          t.isIdentifier(callee.property) &&
          callee.property.name.length > 2
        ) {
          hint = callee.property.name.toLowerCase();
        }
      } else if (t.isMemberExpression(path.node.init)) {
        hint = t.isIdentifier(path.node.init.property)
          ? path.node.init.property.name.toLowerCase()
          : "prop";
      } else if (t.isObjectExpression(path.node.init)) {
        hint = "obj";
      } else if (t.isArrayExpression(path.node.init)) {
        hint = "arr";
      } else if (
        t.isFunctionExpression(path.node.init) ||
        t.isArrowFunctionExpression(path.node.init)
      ) {
        hint = "fn";
      }

      hint = hint.replace(/[^A-z_0-9]/g, "") || "val";
      counters[hint] = (counters[hint] || 0) + 1;
      let newName = hint + (counters[hint]! > 1 ? "_" + counters[hint] : "");
      if (!t.isValidIdentifier(newName)) newName = "_" + newName;

      while (path.scope.hasBinding(newName) || path.scope.hasGlobal(newName)) {
        counters[hint]!++;
        newName = `${hint}_${counters[hint]!}`;
      }

      path.scope.rename(path.node.id.name, newName);
    },
  });

  if (
    t.isExpressionStatement(fnNode.body.body[0]) &&
    t.isStringLiteral(
      (fnNode.body.body[0] as t.ExpressionStatement).expression,
      { value: "use strict" },
    )
  )
    fnNode.body.body.shift();

  ast.program.body = fnNode.body.body;

  return generate(ast, { jsescOption: { minimal: true } }, source).code;
}
