import { writable, type Writable } from "svelte/store";

export let modules: Writable<Record<string, string[]>> = writable({});
export let code = new Map<string, string>();

export async function loadModules() {
  chrome.devtools.inspectedWindow.eval<[string, [string, string][]][]>(
    "Object.values(window).find(value => Array.isArray(value) && value.push != Array.prototype.push).map(c => [c[0][0], Object.entries(c[1]).map(mod=>[mod[0], mod[1].toString()])])",
    (result, err) => {
      if (err) console.log(err);
      if (result) {
        modules.set(
          Object.fromEntries(
            result.map(([chunk, mods]) => [chunk, mods.map(([id]) => id)]),
          ),
        );
        result.forEach(([_, mods]) =>
          mods.forEach(([id, mod]) => code.set(id, mod)),
        );
      }
    },
  );
}
loadModules();
