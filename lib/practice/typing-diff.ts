/** Pure helpers for the typing question (REDESIGN_V3 §8.7): a letter-by-letter comparison and the hint line. */

export type DiffChar = { ch: string; ok: boolean };

const fold = (s: string) => s.normalize("NFC").toLowerCase();

/**
 * Lines up what was typed against the answer (longest common subsequence, case-insensitive): a letter that
 * belongs to the common part is `ok`, the rest are the slips (typed side) or the missing letters (answer side).
 */
export function diffChars(typed: string, answer: string): { typed: DiffChar[]; answer: DiffChar[] } {
  const a = Array.from(typed.trim());
  const b = Array.from(answer.trim());
  const fa = a.map(fold);
  const fb = b.map(fold);
  // len[i][j] = length of the common subsequence of a[i..] and b[j..]
  const len = Array.from({ length: a.length + 1 }, () => new Array<number>(b.length + 1).fill(0));
  for (let i = a.length - 1; i >= 0; i--)
    for (let j = b.length - 1; j >= 0; j--)
      len[i][j] = fa[i] === fb[j] ? len[i + 1][j + 1] + 1 : Math.max(len[i + 1][j], len[i][j + 1]);

  const okA = new Array<boolean>(a.length).fill(false);
  const okB = new Array<boolean>(b.length).fill(false);
  let i = 0;
  let j = 0;
  while (i < a.length && j < b.length) {
    if (fa[i] === fb[j]) {
      okA[i] = okB[j] = true;
      i++;
      j++;
    } else if (len[i + 1][j] >= len[i][j + 1]) i++;
    else j++;
  }
  return {
    typed: a.map((ch, k) => ({ ch, ok: okA[k] })),
    answer: b.map((ch, k) => ({ ch, ok: okB[k] })),
  };
}

/**
 * The hint line: the first `shown` letters of the answer, the other letters as "_" (spaces stay spaces,
 * so "ice cream" keeps its shape). Characters are not letters of the alphabet only: Chinese characters
 * count the same way and hide as "□".
 */
export function hintMask(answer: string, shown: number, hidden = "_"): string {
  let seen = 0;
  return Array.from(answer.trim())
    .map((ch) => {
      if (/\s/.test(ch)) return " ";
      seen++;
      return seen <= shown ? ch : hidden;
    })
    .join("");
}

/** How many hints a word can give before it would just show the whole word. */
export function maxHints(answer: string): number {
  const letters = Array.from(answer.trim()).filter((ch) => !/\s/.test(ch)).length;
  return Math.max(0, letters - 1);
}
