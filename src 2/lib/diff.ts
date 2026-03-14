import type { DiffLine } from "./types";

function lcs(a: string[], b: string[]): number[][] {
  const m = a.length,
    n = b.length;
  const dp: number[][] = Array.from({ length: m + 1 }, () =>
    new Array(n + 1).fill(0),
  );
  for (let i = 1; i <= m; i++)
    for (let j = 1; j <= n; j++)
      dp[i][j] =
        a[i - 1] === b[j - 1]
          ? dp[i - 1][j - 1] + 1
          : Math.max(dp[i - 1][j], dp[i][j - 1]);
  return dp;
}

function backtrack(
  dp: number[][],
  a: string[],
  b: string[],
  i: number,
  j: number,
  out: DiffLine[],
) {
  while (i > 0 || j > 0) {
    if (i > 0 && j > 0 && a[i - 1] === b[j - 1]) {
      out.push({ type: "unchanged", content: a[i - 1], lineNo: j });
      i--;
      j--;
    } else if (j > 0 && (i === 0 || dp[i][j - 1] >= dp[i - 1][j])) {
      out.push({ type: "added", content: b[j - 1], lineNo: j });
      j--;
    } else {
      out.push({ type: "removed", content: a[i - 1] });
      i--;
    }
  }
  out.reverse();
}

export function computeDiff(original: string, modified: string): DiffLine[] {
  const a = original.split("\n");
  const b = modified.split("\n");
  const dp = lcs(a, b);
  const out: DiffLine[] = [];
  backtrack(dp, a, b, a.length, b.length, out);
  return out;
}

export function hasDiff(lines: DiffLine[]): boolean {
  return lines.some((l) => l.type !== "unchanged");
}
