import type { ParseResult } from "@babel/parser";
import traverse from "@babel/traverse";
import * as t from "@babel/types";
import type { Scope } from "@babel/traverse";

export function transform(ast: ParseResult) {
  if (ast.program.body.length !== 1) throw "Expected exactly 1 statement";
  const node = ast.program.body[0];
  let fnNode:
    | t.FunctionDeclaration
    | t.FunctionExpression
    | t.ArrowFunctionExpression;
  if (t.isFunctionDeclaration(node)) fnNode = node;
  else if (t.isExpressionStatement(node)) {
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
    else throw "Unexpected expression type: " + expression.type;
  } else throw "Unexpected node type: " + node?.type;
  if (!t.isBlockStatement(fnNode.body))
    throw "Expected function body to be a block statement";
  if (fnNode.params.length > 3) throw "3+ args";

  const counters: Record<string, number> = {};
  traverse(ast, {
    // Replace function parameters
    Function(path) {
      path.node.params.forEach((param, i) => {
        if (t.isIdentifier(param))
          path.scope.rename(
            param.name,
            path.node == fnNode
              ? ["module", "exports", "require"][i]
              : "param_" + (counters["param"] = (counters["param"] || 0) + 1),
          );
        else if (t.isObjectPattern(param))
          preventDestructureRename(param, path.scope);
      });
    },

    // Replace !0 and !1 with true and false
    UnaryExpression(path) {
      const { node } = path;
      if (
        node.operator === "!" &&
        node.argument.type === "NumericLiteral" &&
        (node.argument.value == 0 || node.argument.value == 1)
      ) {
        path.replaceWith(t.booleanLiteral(!!node.argument.value));
      }
    },

    // Rename objects to their displayName if possible
    AssignmentExpression({ node, scope }) {
      if (
        t.isMemberExpression(node.left) &&
        !node.left.computed &&
        t.isIdentifier(node.left.property) &&
        node.left.property.name === "displayName" &&
        t.isStringLiteral(node.right)
      ) {
        if (t.isIdentifier(node.left.object)) {
          let newName = String(node.right.value);
          newName = newName.replace(/[^A-Za-z0-9_$]/g, "_");
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
      // Prevent destructuring rename
      if (t.isObjectPattern(path.node.id))
        preventDestructureRename(path.node.id, path.scope);
      // Rename short variable names to something more descriptive
      else if (t.isIdentifier(path.node.id) && path.node.id.name.length <= 3) {
        let hint = "val";
        if (
          t.isCallExpression(path.node.init) ||
          t.isOptionalCallExpression(path.node.init) ||
          t.isNewExpression(path.node.init)
        ) {
          const callee = path.node.init.callee;
          if (t.isIdentifier(callee)) {
            if (
              callee.name == "require" &&
              t.isNumericLiteral(path.node.init.arguments[0])
            )
              hint = "mod_" + path.node.init.arguments[0].value;
            else hint = callee.name.toLowerCase();
          } else if (
            t.isMemberExpression(callee) &&
            t.isIdentifier(callee.property) &&
            callee.property.name.length > 2
          ) {
            hint = callee.property.name.toLowerCase();
          }
        } else if (
          t.isMemberExpression(path.node.init) ||
          t.isOptionalMemberExpression(path.node.init)
        ) {
          if (t.isIdentifier(path.node.init.property))
            hint = path.node.init.property.name.toLowerCase();
          else hint = "prop";
        } else if (t.isObjectExpression(path.node.init)) hint = "obj";
        else if (t.isArrayExpression(path.node.init)) hint = "arr";
        else if (
          t.isFunctionExpression(path.node.init) ||
          t.isArrowFunctionExpression(path.node.init)
        )
          hint = "fn";
        else if (path.scope.getBinding(path.node.id.name)?.constant === true)
          hint = "const";

        hint = hint.replace(/[^A-z_0-9]/g, "") || "val";
        counters[hint] = (counters[hint] || 0) + 1;
        let newName = hint + (counters[hint]! > 1 ? "_" + counters[hint] : "");
        if (!t.isValidIdentifier(newName)) newName = "_" + newName;
        while (
          path.scope.hasBinding(newName) ||
          path.scope.hasGlobal(newName)
        ) {
          if (counters[hint] != 0) counters[hint]!++;
          newName = `${hint}_${counters[hint]!}`;
        }

        path.scope.rename(path.node.id.name, newName);
      }
    },

    // Rename restructuring variables
    ObjectProperty(path) {
      const { node, scope } = path;

      if (
        node.computed ||
        node.shorthand ||
        !t.isIdentifier(node.key) ||
        !t.isIdentifier(node.value)
      )
        return;

      const keyName = node.key.name;
      const valueName = node.value.name;

      if (keyName === valueName) {
        node.shorthand = true;
        return;
      }

      const binding = scope.getBinding(valueName);
      if (!binding) return;

      let newName = keyName;
      if (!t.isValidIdentifier(newName)) newName = "_" + newName;

      if (scope.hasBinding(newName) || scope.hasGlobal(newName)) return;

      scope.rename(valueName, newName);
      node.value = t.identifier(newName);
      node.shorthand = true;
    },

    // Transform React.createElement calls to JSX
    CallExpression(path) {
      const callee = path.node.callee;

      if (
        !t.isMemberExpression(callee) ||
        !t.isIdentifier(callee.property, { name: "createElement" })
      )
        return;
      const [type, props, ...childrenArgs] = path.node.arguments;
      if (!type) return;

      let tag: t.JSXIdentifier | t.JSXMemberExpression;
      if (t.isStringLiteral(type)) tag = t.jsxIdentifier(type.value);
      else if (t.isIdentifier(type)) tag = t.jsxIdentifier(type.name);
      else if (t.isMemberExpression(type)) {
        const buildMember = (
          m: t.MemberExpression,
        ): t.JSXMemberExpression | t.JSXIdentifier => {
          const obj = t.isIdentifier(m.object)
            ? t.jsxIdentifier(m.object.name)
            : buildMember(m.object as t.MemberExpression);

          const prop = t.jsxIdentifier((m.property as t.Identifier).name);

          return t.jsxMemberExpression(obj, prop);
        };

        tag = buildMember(type);
      } else return;

      const attrs: (t.JSXAttribute | t.JSXSpreadAttribute)[] = [];
      if (props && !t.isNullLiteral(props)) {
        if (t.isObjectExpression(props)) {
          for (const p of props.properties) {
            if (t.isSpreadElement(p)) {
              attrs.push(t.jsxSpreadAttribute(p.argument));
              continue;
            }

            if (!t.isObjectProperty(p)) continue;
            if (!t.isIdentifier(p.key)) continue;

            const name = t.jsxIdentifier(p.key.name);

            if (t.isBooleanLiteral(p.value, { value: true }))
              attrs.push(t.jsxAttribute(name));
            else if (t.isStringLiteral(p.value))
              attrs.push(t.jsxAttribute(name, p.value));
            else
              attrs.push(
                t.jsxAttribute(
                  name,
                  t.jsxExpressionContainer(p.value as t.Expression),
                ),
              );
          }
        } else attrs.push(t.jsxSpreadAttribute(props as t.Expression));
      }

      const children = [];
      for (const child of childrenArgs) {
        if (t.isNullLiteral(child) || t.isBooleanLiteral(child)) continue;

        if (t.isStringLiteral(child)) children.push(t.jsxText(child.value));
        else if (t.isSpreadElement(child))
          children.push(t.jsxSpreadChild(child.argument));
        else children.push(t.jsxExpressionContainer(child as t.Expression));
      }

      path.replaceWith(
        t.jsxElement(
          t.jsxOpeningElement(tag, attrs, children.length === 0),
          children.length ? t.jsxClosingElement(tag) : null,
          children,
        ),
      );
    },

    // Separate chained instructions
    SequenceExpression({ node, parentPath }) {
      if (parentPath.isReturnStatement({ argument: node }))
        parentPath.replaceWithMultiple([
          ...node.expressions.slice(0, -1).map((e) => t.expressionStatement(e)),
          t.returnStatement(node.expressions[node.expressions.length - 1]),
        ]);
      else if (parentPath.isExpressionStatement())
        parentPath.replaceWithMultiple(
          node.expressions.map((e) => t.expressionStatement(e)),
        );
    },
  });

  // Remove "use strict"
  if (
    t.isExpressionStatement(fnNode.body.body[0]) &&
    t.isStringLiteral(fnNode.body.body[0].expression, {
      value: "use strict",
    })
  )
    fnNode.body.body.shift();
  ast.program.body = fnNode.body.body;
}

function preventDestructureRename(path: t.ObjectPattern, scope: Scope) {
  path.properties.forEach((prop) => {
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
    } else prop.shorthand = false;
  });
}
