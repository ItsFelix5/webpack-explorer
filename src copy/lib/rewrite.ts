import { parse } from "@babel/parser";
import traverseModule from "@babel/traverse";
const traverse = (traverseModule as any).default || traverseModule;
import generateModule from "@babel/generator";
const generate = (generateModule as any).default || generateModule;
import * as t from "@babel/types";
import type { ParseResult } from "@babel/parser";
import type { File } from "@babel/types";
import type { Scope } from "@babel/traverse";

const moduleNameMap: Record<number, string> = {
  0xbad225b5: "React",
};

export interface RawMapping {
  generated: { line: number; column: number };
  original: { line: number; column: number } | undefined;
}

export interface RewriteResult {
  original: string;
  rewritten: string;
  ast: ParseResult<File>;
  rawMappings: RawMapping[];
}

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

export function rewrite(source: string): RewriteResult {
  const original = source;

  const ast = parse(/^\s*function\s*\(/.test(source) ? `(${source})` : source);

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

    // Common forms for IIFEs in minified bundles:
    // 1) (function(){ ... })()
    // 2) !function(){ ... }()   (unary-wrapped IIFE)
    // 3) +function(){ ... }()
    // 4) ~function(){ ... }()
    //
    // Handle direct call expressions where the callee is a function expression,
    // and also unary expressions whose argument is a call expression whose
    // callee is a function expression.
    if (
      t.isCallExpression(expression) &&
      (t.isFunctionExpression(expression.callee) ||
        t.isArrowFunctionExpression(expression.callee))
    ) {
      fnNode = expression.callee as
        | t.FunctionExpression
        | t.ArrowFunctionExpression;
    } else if (
      t.isUnaryExpression(expression) &&
      (expression.operator === "!" ||
        expression.operator === "~" ||
        expression.operator === "+" ||
        expression.operator === "-")
    ) {
      const arg = expression.argument;
      if (
        t.isCallExpression(arg) &&
        (t.isFunctionExpression(arg.callee) ||
          t.isArrowFunctionExpression(arg.callee))
      ) {
        fnNode = arg.callee as t.FunctionExpression | t.ArrowFunctionExpression;
      } else if (
        t.isFunctionExpression(arg) ||
        t.isArrowFunctionExpression(arg)
      ) {
        // Rare: unary applied directly to a function expression (no immediate call)
        fnNode = arg;
      } else {
        throw new Error("Unexpected expression type: " + expression.type);
      }
    } else if (
      t.isFunctionExpression(expression) ||
      t.isArrowFunctionExpression(expression)
    ) {
      fnNode = expression as t.FunctionExpression | t.ArrowFunctionExpression;
    } else {
      throw new Error("Unexpected expression type: " + expression.type);
    }
  } else {
    throw new Error("Unexpected node type: " + node?.type);
  }

  if (!t.isBlockStatement(fnNode.body))
    throw new Error("Expected function body to be a block statement");
  if (fnNode.params.length > 3) throw new Error("3+ args");

  const counters: Record<string, number> = {};

  traverse(ast, {
    Function(path) {
      path.node.params.forEach((param, i) => {
        if (t.isIdentifier(param)) {
          path.scope.rename(
            param.name,
            path.node === fnNode
              ? ["module", "exports", "require"][i]
              : "param_" + (counters["param"] = (counters["param"] || 0) + 1),
          );
        } else if (t.isObjectPattern(param)) {
          preventDestructureRename(param, path.scope);
        }
      });
    },

    UnaryExpression(path) {
      const { node } = path;
      if (
        node.operator === "!" &&
        node.argument.type === "NumericLiteral" &&
        (node.argument.value === 0 || node.argument.value === 1)
      ) {
        path.replaceWith(t.booleanLiteral(node.argument.value !== 0));
      }
    },

    AssignmentExpression({ node, scope }) {
      if (
        t.isMemberExpression(node.left) &&
        !node.left.computed &&
        t.isIdentifier(node.left.property) &&
        node.left.property.name === "displayName" &&
        t.isStringLiteral(node.right)
      ) {
        if (t.isIdentifier(node.left.object)) {
          let newName = String(node.right.value).replace(
            /[^A-Za-z0-9_$]/g,
            "_",
          );
          if (!t.isValidIdentifier(newName)) newName = "_" + newName;
          let base = newName;
          let i = 1;
          while (scope.hasBinding(newName) || scope.hasGlobal(newName))
            newName = `${base}_${i++}`;
          scope.rename(node.left.object.name, newName);
        }
      }
    },

    VariableDeclarator(path) {
      if (t.isObjectPattern(path.node.id)) {
        preventDestructureRename(path.node.id, path.scope);
      } else if (
        t.isIdentifier(path.node.id) &&
        path.node.id.name.length <= 3
      ) {
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
            ) {
              hint =
                moduleNameMap[
                  (path.node.init.arguments[0] as t.NumericLiteral).value
                ] ||
                "mod_" +
                  (path.node.init.arguments[0] as t.NumericLiteral).value;
            } else {
              hint = callee.name.toLowerCase();
            }
          } else if (
            t.isMemberExpression(callee) &&
            t.isIdentifier(callee.property) &&
            callee.property.name.length > 2
          ) {
            hint = callee.property.name.toLowerCase();
          }
        } else if (t.isMemberExpression(path.node.init)) {
          if (t.isIdentifier(path.node.init.property))
            hint = path.node.init.property.name.toLowerCase();
          else hint = "prop";
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

        hint = hint.replace(/[^A-Za-z_0-9]/g, "") || "val";
        counters[hint] = (counters[hint] || 0) + 1;
        let newName = hint + (counters[hint]! > 1 ? "_" + counters[hint] : "");
        if (!t.isValidIdentifier(newName)) newName = "_" + newName;

        while (
          path.scope.hasBinding(newName) ||
          path.scope.hasGlobal(newName)
        ) {
          counters[hint]!++;
          newName = `${hint}_${counters[hint]!}`;
        }

        path.scope.rename(path.node.id.name, newName);
      }
    },
  });

  if (
    t.isExpressionStatement(fnNode.body.body[0]) &&
    t.isStringLiteral(
      (fnNode.body.body[0] as t.ExpressionStatement).expression,
      { value: "use strict" },
    )
  ) {
    fnNode.body.body.shift();
  }

  ast.program.body = fnNode.body.body;

  const genResult = generate(
    ast,
    {
      jsescOption: { minimal: true },
      sourceMaps: true,
      sourceFileName: "original.js",
    },
    source,
  );

  return {
    original,
    rewritten: genResult.code,
    ast,
    rawMappings: genResult.rawMappings as RawMapping[],
  };
}
