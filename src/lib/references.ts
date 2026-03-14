import { parse } from "@babel/parser";
import traverse, { Binding } from "@babel/traverse";

export function getReferences(code: string) {
  const ast = parse(code, { plugins: ["jsx"] });

  const tokenMap = new Map<number, string>();
  const definitions = new Map<string, number>();
  const visited = new Set<Binding>();
  let counter = 0;

  ((traverse as any).default as typeof traverse)(ast as any, {
    Scope(path) {
      const allBindings = path.scope.getAllBindings();
      for (const binding of Object.values(allBindings)) {
        if (!binding || visited.has(binding)) continue;
        visited.add(binding);
        const id = String(counter++);

        tokenMap.set(binding.identifier.start, id);
        definitions.set(id, binding.identifier.start);
        for (const refPath of binding.referencePaths) {
          if (refPath.node) tokenMap.set(refPath.node.start, id);
        }
      }
    },
  });
  return { tokenMap, definitions };
}
