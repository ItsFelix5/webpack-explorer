import type { ParseResult } from "@babel/parser";
import traverse, { type Binding } from "@babel/traverse";

export function getReferences(ast: ParseResult) {
  const tokenMap = new Map<number, number>();
  const definitions = new Map<number, number>();
  const usages = new Map<number, number[]>();
  const visited = new Set<Binding>();
  let counter = 0;

  traverse(ast as any, {
    Scope(path) {
      const allBindings = path.scope.getAllBindings();
      for (const binding of Object.values(allBindings)) {
        if (!binding || visited.has(binding)) continue;
        visited.add(binding);

        tokenMap.set(binding.identifier.start!, ++counter);
        definitions.set(binding.identifier.start!, counter);
        usages.set(counter, [
          binding.identifier.start!,
          ...binding.referencePaths
            ?.map((p) => p.node.start)
            .filter((p) => p != undefined),
        ]);
        for (const refPath of binding.referencePaths) {
          if (refPath.node) tokenMap.set(refPath.node.start!, counter);
        }
      }
    },
  });
  return { tokenMap, definitions, usages };
}
