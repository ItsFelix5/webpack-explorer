<script lang="ts">
    import "./lib/shims";
    import Sidebar from "./components/Sidebar.svelte";
    import TabBar from "./components/TabBar.svelte";
    import EditorArea from "./components/EditorArea.svelte";
    import { rewrite } from "./lib/rewrite";
    import { highlight, spansToLines } from "./lib/highlight";
    import { parse } from "@babel/parser";
    import traverse from "@babel/traverse";
    import {
        mapGeneratedRangeToOriginal,
        mapOriginalRangeToGenerated,
    } from "./lib/sourcemap";
    import type { RewriteResult } from "./lib/rewrite";
    import type { HighlightSpan } from "./lib/highlight";
    import type { CharRange } from "./lib/sourcemap";
    //import { validateSelection } from "../../cli/selection";

    let preEl: HTMLElement | null = $state(null);

    interface FileEntry {
        name: string;
        path: string;
        content: string;
    }

    interface FolderEntry {
        name: string;
        children: (FileEntry | FolderEntry)[];
        expanded: boolean;
    }

    function isFolder(entry: FileEntry | FolderEntry): entry is FolderEntry {
        return "children" in entry;
    }

    type RewriteState =
        | { status: "idle" }
        | { status: "loading" }
        | { status: "done"; result: RewriteResult }
        | { status: "error"; message: string };

    interface Selection {
        origRange: CharRange;
        rewrRange: CharRange;
    }

    interface Patch {
        id: string;
        patchId: string;
        originalCode: string;
        find: string;
        replace: string;
    }

    interface PatchModal {
        open: boolean;
        patchId: string;
        originalCode: string;
        sourceCode: string;
        origStart: number;
        origEnd: number;
    }

    interface Tab {
        path: string;
        name: string;
        content: string;
        view: "original" | "rewritten";
        rewriteState: RewriteState;
        selection: Selection | null;
    }

    let files: (FileEntry | FolderEntry)[] = $state([
        {
            name: "top",
            expanded: true,
            children: [
                {
                    name: "app.slack.com",
                    expanded: true,
                    children: [
                        {
                            name: "main.js",
                            path: "top/app.slack.com/main.js",
                            content: `(function(module, exports, require) {\n  "use strict";\n\n  var e = require(0xbad225b5);\n  var t = require(42);\n\n  var fn = function() {\n    return e.createElement("div", null, !0);\n  };\n\n  fn.displayName = "MyComponent";\n\n  var obj = {\n    foo: fn,\n    bar: !1,\n  };\n\n  exports.default = obj;\n})\n//`,
                        },
                        {
                            name: "vendor.js",
                            path: "top/app.slack.com/vendor.js",
                            content: `!function(e,t){"object"==typeof exports&&"object"==typeof module\n  ?module.exports=t()\n  :"function"==typeof define&&define.amd\n  ?define([],t)\n  :t();\n}(self,function(){\n  // bundled vendor code\n  return {};\n});`,
                        },
                        {
                            name: "styles.css",
                            path: "top/app.slack.com/styles.css",
                            content: `/* styles.css */\n:root {\n  --primary: #4a154b;\n  --text: #1d1c1d;\n}\n\nbody {\n  font-family: Slack-Lato, Lato, sans-serif;\n  background: #fff;\n  color: var(--text);\n}`,
                        },
                    ],
                },
                {
                    name: "cdn.jsdelivr.net",
                    expanded: false,
                    children: [
                        {
                            name: "react.min.js",
                            path: "top/cdn.jsdelivr.net/react.min.js",
                            content: `/** @license React v18.2.0\n * react.production.min.js\n */\n'use strict';\nvar l=Symbol.for("react.element");\n// ... minified react source`,
                        },
                    ],
                },
            ],
        },
    ]);

    let tabs: Tab[] = $state([]);
    let activeTabPath: string | null = $state(null);
    let patches: Patch[] = $state([]);
    let patchModal: PatchModal = $state({
        open: false,
        patchId: "",
        originalCode: "",
        sourceCode: "",
        origStart: 0,
        origEnd: 0,
    });
    let patchesOpen: boolean = $state(false);

    let sidebarWidth = $state(220);
    let isResizing = $state(false);
    let startX = $state(0);
    let startWidth = $state(0);

    function openFile(file: FileEntry) {
        const existing = tabs.find((t) => t.path === file.path);
        if (!existing) {
            const tab: Tab = {
                path: file.path,
                name: file.name,
                content: file.content,
                view: "rewritten",
                rewriteState: { status: "idle" },
                selection: null,
            };
            tabs.push(tab);
            // Trigger rewrite immediately so rewritten view is available without clicking
            if (tab.rewriteState.status === "idle") triggerRewrite(tab);
        } else {
            // Ensure existing tab switches to rewritten and triggers rewrite if needed
            existing.view = "rewritten";
            if (existing.rewriteState.status === "idle")
                triggerRewrite(existing);
        }
        activeTabPath = file.path;
    }

    function closeTab(path: string, e: MouseEvent) {
        e.stopPropagation();
        const idx = tabs.findIndex((t) => t.path === path);
        tabs.splice(idx, 1);
        if (activeTabPath === path) {
            activeTabPath = tabs[idx]?.path ?? tabs[idx - 1]?.path ?? null;
        }
    }

    function toggleFolder(folder: FolderEntry) {
        folder.expanded = !folder.expanded;
    }

    function onResizerMousedown(e: MouseEvent) {
        isResizing = true;
        startX = e.clientX;
        startWidth = sidebarWidth;
    }

    function onMousemove(e: MouseEvent) {
        if (!isResizing) return;
        const delta = e.clientX - startX;
        sidebarWidth = Math.max(140, Math.min(480, startWidth + delta));
    }

    function onMouseup() {
        isResizing = false;
    }

    function setView(tab: Tab, view: "original" | "rewritten") {
        tab.view = view;
        if (view === "rewritten" && tab.rewriteState.status === "idle") {
            triggerRewrite(tab);
        }
    }

    function triggerRewrite(tab: Tab) {
        tab.rewriteState = { status: "loading" };
        try {
            const result = rewrite(tab.content);
            tab.rewriteState = { status: "done", result };
        } catch (err) {
            tab.rewriteState = {
                status: "error",
                message: err instanceof Error ? err.message : String(err),
            };
        }
    }

    const activeTab = $derived(
        tabs.find((t) => t.path === activeTabPath) ?? null,
    );

    function openPatchModal(tab: Tab) {
        const sel = tab.selection;
        if (!sel) return;
        const code = tab.content;
        const originalCode = code.slice(sel.origRange.start, sel.origRange.end);
        patchModal = {
            open: true,
            patchId: "",
            originalCode,
            sourceCode: code,
            origStart: sel.origRange.start,
            origEnd: sel.origRange.end,
        };
    }

    function uniqueContext(
        source: string,
        start: number,
        end: number,
        replacement: string,
    ): { find: string; replace: string } {
        const selected = source.slice(start, end);
        let radius = 0;
        while (true) {
            const ctxStart = Math.max(0, start - radius);
            const ctxEnd = Math.min(source.length, end + radius);
            const find = source.slice(ctxStart, ctxEnd);
            const replace =
                source.slice(ctxStart, start) +
                replacement +
                source.slice(end, ctxEnd);
            const first = source.indexOf(find);
            if (first !== -1 && source.indexOf(find, first + 1) === -1) {
                return { find, replace };
            }
            if (ctxStart === 0 && ctxEnd === source.length) {
                return { find, replace };
            }
            radius += 8;
        }
    }

    function confirmPatch() {
        const id = patchModal.patchId.trim();
        if (!id) return;
        const { originalCode, sourceCode, origStart, origEnd } = patchModal;
        const replacement = `require(${id})(()=>${originalCode})`;
        const { find, replace } = uniqueContext(
            sourceCode,
            origStart,
            origEnd,
            replacement,
        );
        patches.push({ id, patchId: id, originalCode, find, replace });
        patchModal = {
            open: false,
            patchId: "",
            originalCode: "",
            sourceCode: "",
            origStart: 0,
            origEnd: 0,
        };
        patchesOpen = true;
    }

    function cancelPatch() {
        patchModal = {
            open: false,
            patchId: "",
            originalCode: "",
            sourceCode: "",
            origStart: 0,
            origEnd: 0,
        };
    }

    // Global keyboard handler to improve modal accessibility:
    // - Close the patch modal when Escape is pressed.
    function handleGlobalKeydown(e: KeyboardEvent) {
        if (e.key === "Escape" && patchModal.open) {
            cancelPatch();
        }
    }

    function removePatch(idx: number) {
        patches.splice(idx, 1);
    }

    async function copyToClipboard(text: string) {
        await navigator.clipboard.writeText(text);
    }

    function getDisplayCode(tab: Tab): string | null {
        if (tab.view === "original") return tab.content;
        if (tab.rewriteState.status === "done")
            return tab.rewriteState.result.rewritten;
        return null;
    }

    function getHighlightedLines(code: string): HighlightSpan[][] {
        return spansToLines(highlight(code));
    }

    interface MarkedSpan {
        cls: string;
        text: string;
        selected: boolean;
    }

    function applyRangeSelection(
        lines: HighlightSpan[][],
        range: CharRange | null,
    ): MarkedSpan[][] {
        let offset = 0;
        return lines.map((line, li) => {
            const out: MarkedSpan[] = [];
            for (const span of line) {
                const spanStart = offset;
                const spanEnd = offset + span.text.length;
                if (range && spanEnd > range.start && spanStart < range.end) {
                    const selStart = Math.max(0, range.start - spanStart);
                    const selEnd = Math.min(
                        span.text.length,
                        range.end - spanStart,
                    );
                    if (selStart > 0)
                        out.push({
                            cls: span.cls,
                            text: span.text.slice(0, selStart),
                            selected: false,
                        });
                    out.push({
                        cls: span.cls,
                        text: span.text.slice(selStart, selEnd),
                        selected: true,
                    });
                    if (selEnd < span.text.length)
                        out.push({
                            cls: span.cls,
                            text: span.text.slice(selEnd),
                            selected: false,
                        });
                } else {
                    out.push({
                        cls: span.cls,
                        text: span.text,
                        selected: false,
                    });
                }
                offset += span.text.length;
            }
            if (li < lines.length - 1) offset += 1;
            return out;
        });
    }

    // Coalesce adjacent spans into groups so highlighting doesn't restart per-token.
    function groupSpans(
        line: MarkedSpan[],
    ): { selected: boolean; cls?: string; text: string }[] {
        const groups: { selected: boolean; cls?: string; text: string }[] = [];
        for (const s of line) {
            if (groups.length === 0) {
                groups.push({ selected: s.selected, cls: s.cls, text: s.text });
                continue;
            }
            const last = groups[groups.length - 1];
            if (s.selected && last.selected) {
                // merge adjacent selected pieces into one highlighted group
                last.text += s.text;
            } else if (!s.selected && !last.selected && last.cls === s.cls) {
                // merge adjacent non-selected spans with the same class to avoid fragmenting
                last.text += s.text;
            } else {
                groups.push({ selected: s.selected, cls: s.cls, text: s.text });
            }
        }
        return groups;
    }

    function charOffsetInPre(
        pre: HTMLElement,
        node: Node,
        nodeOffset: number,
    ): number {
        let total = 0;
        const walker = document.createTreeWalker(pre, NodeFilter.SHOW_TEXT);
        let current: Node | null;
        while ((current = walker.nextNode())) {
            if (current === node) {
                return total + nodeOffset;
            }
            total += (current as Text).length;
        }
        return total;
    }

    function onCodeMouseup(
        tab: Tab,
        pre: HTMLElement,
        view: "original" | "rewritten",
    ) {
        // Allow selecting tokens via click or drag. If rewrite done, map ranges between views.
        const domSel = window.getSelection();
        if (!domSel || !domSel.anchorNode || !domSel.focusNode) {
            tab.selection = null;
            return;
        }

        // Compute raw offsets even for collapsed selections (single click).
        let rawStart = charOffsetInPre(
            pre,
            domSel.anchorNode,
            domSel.anchorOffset,
        );
        let rawEnd = charOffsetInPre(pre, domSel.focusNode, domSel.focusOffset);
        if (rawStart > rawEnd) [rawStart, rawEnd] = [rawEnd, rawStart];

        // If there is truly no movement and it's collapsed, we'll still attempt to select the token under caret.
        // Prepare code and tokenized spans for the current view.
        const code =
            view === "rewritten" && tab.rewriteState.status === "done"
                ? tab.rewriteState.result.rewritten
                : tab.content;
        const lines = getHighlightedLines(code);

        // Expand selection to semantic AST node boundaries when possible.
        // Prefer smallest AST node that fully contains the selection (so single click inside `23` -> select literal `23`),
        // but a click inside `require(23)` should allow selecting the whole call or just the literal depending on target.
        // Falls back to token/span-based selection if parsing fails or no suitable AST node is found.
        function expandToTokenBoundaries(
            lines: HighlightSpan[][],
            start: number,
            end: number,
        ) {
            // helper to convert line/col (1-based line, 0-based column) into character offset
            function lineColToOffsetLocal(
                text: string,
                line: number,
                col: number,
            ) {
                let off = 0;
                let curLine = 1;
                while (curLine < line) {
                    const nl = text.indexOf("\n", off);
                    if (nl === -1) return text.length;
                    off = nl + 1;
                    curLine++;
                }
                return off + col;
            }

            // Attempt AST-guided semantic selection by parsing the current code text (prefer minimal semantic nodes)
            try {
                const codeText =
                    tab.view === "rewritten" &&
                    tab.rewriteState.status === "done"
                        ? (tab.rewriteState as any).result.rewritten
                        : tab.content;

                // parse code to AST with locations enabled
                const ast = parse(codeText, {
                    sourceType: "module",
                    plugins: ["jsx", "classProperties", "objectRestSpread"],
                    ranges: false,
                    tokens: false,
                    allowReturnOutsideFunction: true,
                });

                const nodes: {
                    start: number;
                    end: number;
                    type: string;
                    node: any;
                }[] = [];

                // walk AST and collect nodes that have loc info
                function walk(node: any) {
                    if (!node || typeof node !== "object") return;
                    if (node.loc && node.loc.start && node.loc.end) {
                        const s = lineColToOffsetLocal(
                            codeText,
                            node.loc.start.line,
                            node.loc.start.column,
                        );
                        const e = lineColToOffsetLocal(
                            codeText,
                            node.loc.end.line,
                            node.loc.end.column,
                        );
                        if (e > s)
                            nodes.push({
                                start: s,
                                end: e,
                                type: node.type,
                                node,
                            });
                    }
                    for (const key of Object.keys(node)) {
                        const child = node[key];
                        if (Array.isArray(child)) {
                            for (const c of child) walk(c);
                        } else if (child && typeof child.type === "string") {
                            walk(child);
                        }
                    }
                }

                walk(ast.program || ast);

                // Find nodes that fully contain the selection [start, end)
                const containers = nodes
                    .filter((n) => n.start <= start && n.end >= end)
                    .sort((a, b) => a.end - a.start - (b.end - b.start));

                if (containers.length > 0) {
                    const pick = containers[0];

                    // Prefer exact semantic units:
                    // - Literals and identifiers should be selected as-is.
                    if (
                        pick.type === "Identifier" ||
                        pick.type === "StringLiteral" ||
                        pick.type === "NumericLiteral" ||
                        pick.type === "BooleanLiteral" ||
                        pick.type === "NullLiteral" ||
                        pick.type === "BigIntLiteral" ||
                        pick.type === "TemplateLiteral" ||
                        pick.type.endsWith("Literal")
                    ) {
                        return { start: pick.start, end: pick.end };
                    }

                    // - Call expressions (require(23), fn(x)) select full call
                    if (
                        pick.type === "CallExpression" ||
                        pick.type === "NewExpression"
                    ) {
                        return { start: pick.start, end: pick.end };
                    }

                    // - Member expressions select the full chain (a.b.c)
                    if (pick.type === "MemberExpression") {
                        return { start: pick.start, end: pick.end };
                    }

                    // - Object/Array/function containers select whole node
                    if (
                        pick.type === "ObjectExpression" ||
                        pick.type === "ArrayExpression" ||
                        pick.type === "FunctionExpression" ||
                        pick.type === "ArrowFunctionExpression"
                    ) {
                        return { start: pick.start, end: pick.end };
                    }

                    // fallback to that node
                    return { start: pick.start, end: pick.end };
                }

                // If no node fully contains selection, pick the smallest intersecting node
                const intersecting = nodes
                    .filter((n) => n.end > start && n.start < end)
                    .sort((a, b) => a.end - a.start - (b.end - b.start));

                if (intersecting.length > 0) {
                    const pick = intersecting[0];
                    return { start: pick.start, end: pick.end };
                }
            } catch (e) {
                // parsing/traversal failed — fall back to token/span logic below
            }

            // Token/span fallback: choose the span(s) that intersect selection; prefer nearest non-whitespace span
            let offset = 0;
            let tokenStart: number | null = null;
            let tokenEnd: number | null = null;

            for (let li = 0; li < lines.length; li++) {
                const line = lines[li];
                for (let si = 0; si < line.length; si++) {
                    const span = line[si];
                    const s = offset;
                    const e = offset + span.text.length;
                    if (e > start && s < end) {
                        if (tokenStart === null) tokenStart = s;
                        tokenEnd = e;
                    }
                    offset = e;
                }
                offset += 1;
            }

            if (tokenStart === null) {
                offset = 0;
                let found = false;
                for (let li = 0; li < lines.length && !found; li++) {
                    const line = lines[li];
                    for (let si = 0; si < line.length; si++) {
                        const span = line[si];
                        const s = offset;
                        const e = offset + span.text.length;
                        if (s <= start && start <= e) {
                            tokenStart = s;
                            tokenEnd = e;
                            found = true;
                            break;
                        }
                        offset = e;
                    }
                    offset += 1;
                }

                if (tokenStart === null) {
                    offset = 0;
                    let afterFound = false;
                    for (let li = 0; li < lines.length && !afterFound; li++) {
                        const line = lines[li];
                        for (let si = 0; si < line.length; si++) {
                            const span = line[si];
                            const s = offset;
                            const e = offset + span.text.length;
                            if (e >= start) {
                                tokenStart = s;
                                tokenEnd = e;
                                afterFound = true;
                                break;
                            }
                            offset = e;
                        }
                        offset += 1;
                    }
                    if (!afterFound) {
                        offset = 0;
                        for (let li = 0; li < lines.length; li++) {
                            const line = lines[li];
                            for (let si = 0; si < line.length; si++) {
                                const span = line[si];
                                const s = offset;
                                const e = offset + span.text.length;
                                tokenStart = s;
                                tokenEnd = e;
                                offset = e;
                            }
                            offset += 1;
                        }
                    }
                }
            }

            if (tokenStart === null) tokenStart = start;
            if (tokenEnd === null) tokenEnd = Math.max(tokenStart + 1, end);

            return { start: tokenStart, end: tokenEnd };
        }

        let expanded = expandToTokenBoundaries(lines, rawStart, rawEnd);

        // Unconditionally expand identifier-in-member to full MemberExpression using AST before validation.
        // This ensures selecting `createElement` becomes `React.createElement` (or similar dotted chains).
        try {
            const ast = parse(code, {
                sourceType: "module",
                plugins: ["jsx", "classProperties", "objectRestSpread"],
                ranges: true,
                allowReturnOutsideFunction: true,
            });
            // Find the smallest AST node that contains the expanded range
            let containingNode: any = null;
            traverse(ast as any, {
                enter(path: any) {
                    const n = path.node;
                    if (
                        typeof n.start !== "number" ||
                        typeof n.end !== "number"
                    )
                        return;
                    if (n.start <= expanded.start && n.end >= expanded.end) {
                        if (
                            !containingNode ||
                            n.end - n.start <
                                containingNode.end - containingNode.start
                        ) {
                            containingNode = n;
                        }
                    }
                },
            });

            if (containingNode) {
                // If the containing node is itself a MemberExpression, expand to it.
                if (containingNode.type === "MemberExpression") {
                    expanded = {
                        start: containingNode.start,
                        end: containingNode.end,
                    };
                } else {
                    // Otherwise, try to find an enclosing MemberExpression by locating the path then climbing parentPath.
                    let memberFound: any = null;
                    traverse(ast as any, {
                        enter(path: any) {
                            if (path.node === containingNode) {
                                // climb parentPath to find an enclosing MemberExpression
                                let parentPath = path.parentPath;
                                while (parentPath) {
                                    if (
                                        parentPath.node &&
                                        parentPath.node.type ===
                                            "MemberExpression"
                                    ) {
                                        memberFound = parentPath.node;
                                        break;
                                    }
                                    parentPath = parentPath.parentPath;
                                }
                                path.stop();
                            }
                        },
                    });
                    if (memberFound) {
                        expanded = {
                            start: memberFound.start,
                            end: memberFound.end,
                        };
                    }
                }
            }
        } catch (e) {
            // ignore parse errors here and fall back to validator logic below
        }

        // Validate selection using shared selection rules; allow validator to auto-expand the selection.
        try {
            const validation = validateSelection(
                code,
                expanded.start,
                expanded.end,
            );
            if (!validation.allowed) {
                tab.selection = null;
                return;
            }
            // If validator suggests an adjusted range, use it (auto-expand).
            if (validation.autoExpand) {
                expanded = {
                    start: validation.autoExpand.start,
                    end: validation.autoExpand.end,
                };
            }
        } catch (e) {
            // Validator failed; attempt a local fallback: parse AST and auto-expand member expression parts.
            try {
                const ast = parse(code, {
                    sourceType: "module",
                    plugins: ["jsx", "classProperties", "objectRestSpread"],
                    ranges: true,
                    allowReturnOutsideFunction: true,
                });
                // Find the smallest node that contains the expanded range
                let fallbackNode: any = null;
                traverse(ast as any, {
                    enter(path: any) {
                        const n = path.node;
                        if (
                            typeof n.start !== "number" ||
                            typeof n.end !== "number"
                        )
                            return;
                        if (
                            n.start <= expanded.start &&
                            n.end >= expanded.end
                        ) {
                            if (
                                !fallbackNode ||
                                n.end - n.start <
                                    fallbackNode.end - fallbackNode.start
                            )
                                fallbackNode = n;
                        }
                    },
                });
                // If the fallback node is a MemberExpression or is inside one, expand to the MemberExpression
                if (fallbackNode) {
                    if (fallbackNode.type === "MemberExpression") {
                        expanded = {
                            start: fallbackNode.start,
                            end: fallbackNode.end,
                        };
                    } else {
                        // Walk up parents to find a MemberExpression if present
                        let parentPath: any = null;
                        traverse(ast as any, {
                            enter(path: any) {
                                if (path.node === fallbackNode) {
                                    parentPath = path.parentPath;
                                    path.stop();
                                }
                            },
                        });
                        let p = parentPath ? parentPath.node : null;
                        while (p) {
                            if (p.type === "MemberExpression") {
                                expanded = { start: p.start, end: p.end };
                                break;
                            }
                            // try to go up (best-effort; parent references may not be available on nodes)
                            p = (p as any).parent || null;
                        }
                    }
                }
            } catch (e2) {
                // fallback parse failed; leave expanded as-is
            }
        }

        // Always attempt dotted-chain expansion when selection is an identifier part.
        // This ensures selecting `createElement` will expand to `React.createElement` when appropriate.
        try {
            function isIdentChar(ch: string) {
                return /[A-Za-z0-9_$]/.test(ch);
            }
            function expandDottedChain(codeText: string, s: number, e: number) {
                let startPos = s;
                let endPos = e;
                // expand left to include identifier part
                while (startPos > 0 && isIdentChar(codeText[startPos - 1]))
                    startPos--;
                // expand right to include identifier part
                while (
                    endPos < codeText.length &&
                    isIdentChar(codeText[endPos])
                )
                    endPos++;
                // expand outward to include dotted chains on both sides
                let again = true;
                while (again) {
                    again = false;
                    // check left: if there's ".ident" immediately left, include it
                    if (startPos > 1 && codeText[startPos - 1] === ".") {
                        let p = startPos - 2;
                        while (p >= 0 && isIdentChar(codeText[p])) p--;
                        if (p < startPos - 2) {
                            startPos = p + 1;
                            again = true;
                        }
                    }
                    // check right: if there's ".ident" immediately right, include it
                    if (endPos < codeText.length && codeText[endPos] === ".") {
                        let p = endPos + 1;
                        let found = false;
                        while (
                            p < codeText.length &&
                            isIdentChar(codeText[p])
                        ) {
                            p++;
                            found = true;
                        }
                        if (found) {
                            endPos = p;
                            again = true;
                        }
                    }
                }
                return { start: startPos, end: endPos };
            }
            const dotted = expandDottedChain(
                code,
                expanded.start,
                expanded.end,
            );
            if (
                dotted.start !== expanded.start ||
                dotted.end !== expanded.end
            ) {
                expanded = dotted;
            }
        } catch (__ignore) {
            // If anything goes wrong here, keep the existing expanded range.
        }

        // If rewrite is available, map between views; otherwise set selection locally.
        if (tab.rewriteState.status === "done") {
            const { rawMappings, rewritten } = tab.rewriteState.result;
            const original = tab.content;

            if (view === "rewritten") {
                const origRange = mapGeneratedRangeToOriginal(
                    rewritten,
                    original,
                    rawMappings,
                    expanded.start,
                    expanded.end,
                );
                if (!origRange) {
                    tab.selection = null;
                    return;
                }
                tab.selection = {
                    rewrRange: { start: expanded.start, end: expanded.end },
                    origRange,
                };
            } else {
                const rewrRange = mapOriginalRangeToGenerated(
                    rewritten,
                    original,
                    rawMappings,
                    expanded.start,
                    expanded.end,
                );
                if (!rewrRange) {
                    tab.selection = null;
                    return;
                }
                tab.selection = {
                    origRange: { start: expanded.start, end: expanded.end },
                    rewrRange,
                };
            }
        } else {
            // No rewrite mappings yet: set selection only in the active view (store as both fields so UI can use the active one)
            if (view === "rewritten") {
                tab.selection = {
                    rewrRange: { start: expanded.start, end: expanded.end },
                    origRange: { start: expanded.start, end: expanded.end },
                };
            } else {
                tab.selection = {
                    origRange: { start: expanded.start, end: expanded.end },
                    rewrRange: { start: expanded.start, end: expanded.end },
                };
            }
        }
    }
</script>

<svelte:window on:keydown={handleGlobalKeydown} />

<!-- svelte-ignore a11y_no_static_element_interactions -->
<div
    class="layout"
    onmousemove={onMousemove}
    onmouseup={onMouseup}
    onmouseleave={onMouseup}
>
    <aside class="sidebar" style="width: {sidebarWidth}px">
        <Sidebar {files} {activeTabPath} {openFile} {toggleFolder} />
    </aside>

    <!-- svelte-ignore a11y_no_static_element_interactions -->
    <div
        class="resizer"
        onmousedown={onResizerMousedown}
        class:resizing={isResizing}
    ></div>

    <main class="editor-area">
        <TabBar
            {tabs}
            {activeTabPath}
            {closeTab}
            setActive={(p) => (activeTabPath = p)}
        />

        <EditorArea
            {activeTab}
            {patches}
            {patchesOpen}
            {patchModal}
            {setView}
            {openPatchModal}
            {copyToClipboard}
            {removePatch}
            setPatchesOpen={(v) => (patchesOpen = v)}
            {getDisplayCode}
            {getHighlightedLines}
            {applyRangeSelection}
            {groupSpans}
            {onCodeMouseup}
            setPatchId={(id) => (patchModal = { ...patchModal, patchId: id })}
            {confirmPatch}
            {cancelPatch}
            {uniqueContext}
        />
    </main>
</div>
