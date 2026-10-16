import { normalizeEn } from "./normalize";

/** Damerau-Levenshtein (optimal string alignment) distance. */
export function editDistance(a: string, b: string): number {
  const m = a.length;
  const n = b.length;
  if (!m) return n;
  if (!n) return m;
  const d: number[][] = Array.from({ length: m + 1 }, (_, i) => {
    const row = new Array<number>(n + 1).fill(0);
    row[0] = i;
    return row;
  });
  for (let j = 0; j <= n; j++) d[0][j] = j;
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + cost);
      if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) {
        d[i][j] = Math.min(d[i][j], d[i - 2][j - 2] + 1);
      }
    }
  }
  return d[m][n];
}

export type TypingVerdict = "correct" | "almost" | "wrong";

/**
 * Typing-mode check for English (§10.4): case-insensitive; one typo allowed
 * for words of 6+ letters ("gần đúng").
 */
export function checkEnglishAnswer(input: string, expected: string): TypingVerdict {
  const a = normalizeEn(input);
  const b = normalizeEn(expected);
  if (!a) return "wrong";
  if (a === b) return "correct";
  if (b.replace(/\s/g, "").length >= 6 && editDistance(a, b) <= 1) return "almost";
  return "wrong";
}
