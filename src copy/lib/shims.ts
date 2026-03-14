/**
 * Minimal browser shim for `process` to satisfy libraries (like Babel) that expect
 * `process` to exist at runtime. This module installs a lightweight `process`
 * on `globalThis` when imported.
 *
 * Usage:
 *   import "./lib/shims";
 *
 * The shim aims to be intentionally small:
 * - provides `process.env.NODE_ENV`
 * - provides `process.nextTick`
 * - provides `process.cwd`
 * - marks `process.browser = true`
 *
 * It is idempotent: importing multiple times is safe.
 */

/* eslint-disable @typescript-eslint/no-explicit-any */
declare global {
  // ensure TS knows about the injected global
  var process: any;
  interface ImportMeta {
    env?: Record<string, string>;
  }
}

const installProcessShim = () => {
  if (typeof globalThis === "undefined") return;

  // If process already exists (maybe provided by the environment), do nothing.
  if (globalThis.process && typeof globalThis.process === "object") {
    return;
  }

  // Attempt to infer NODE_ENV from import.meta.env (Vite) when available.
  const inferredNodeEnv =
    (typeof (globalThis as any).importMeta !== "undefined" &&
      (globalThis as any).importMeta?.env?.MODE) ||
    (typeof (globalThis as any).importMeta !== "undefined" &&
      (globalThis as any).importMeta?.env?.NODE_ENV) ||
    (typeof (globalThis as any).process === "object" &&
      (globalThis as any).process?.env?.NODE_ENV) ||
    (typeof process !== "undefined" && (process as any).env?.NODE_ENV) ||
    "production";

  const proc: Record<string, any> = {
    // Minimal env object
    env: {
      NODE_ENV: inferredNodeEnv,
    },

    // indicate we're running in a browser-like environment
    browser: true,

    // convenience
    platform: "browser",

    // nextTick polyfill using setTimeout; keeps semantics simple for libs that use it
    nextTick: (fn: (...args: any[]) => void, ...args: any[]) =>
      setTimeout(() => fn(...args), 0),

    // minimal cwd implementation
    cwd: () => "/",

    // no-op on/off event emitter stubs (some libs call process.on('warning', ...))
    on: (_ev: string, _fn: (...args: any[]) => void) => undefined,
    once: (_ev: string, _fn: (...args: any[]) => void) => undefined,
    off: (_ev: string, _fn: (...args: any[]) => void) => undefined,
    emit: (_ev: string, ..._args: any[]) => false,
  };

  try {
    // define non-enumerable to mimic Node's process being non-enumerable in many contexts
    Object.defineProperty(globalThis, "process", {
      configurable: true,
      enumerable: false,
      value: proc,
      writable: true,
    });
  } catch {
    // fallback: assign directly (older browsers / restricted environments)
    (globalThis as any).process = proc;
  }
};

installProcessShim();

export default globalThis.process;
