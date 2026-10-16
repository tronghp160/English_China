import { Converter } from "opencc-js/t2cn";
import type { LangCode } from "./types";

let toSimplified: ((s: string) => string) | undefined;

/** Traditional (TW/HK) -> Simplified Chinese. */
export function traditionalToSimplified(text: string): string {
  toSimplified ??= Converter({ from: "tw", to: "cn" });
  return toSimplified(text);
}

/** EN: lowercase + trim + collapse whitespace; also unifies curly apostrophes. */
export function normalizeEn(term: string): string {
  return term
    .normalize("NFC")
    .replace(/[’‘`]/g, "'")
    .trim()
    .replace(/\s+/g, " ")
    .toLowerCase();
}

/** ZH: traditional -> simplified, remove all whitespace, full-width ASCII -> half-width. */
export function normalizeZh(term: string): string {
  const halfWidth = term
    .normalize("NFC")
    .replace(/[！-～]/g, (c) => String.fromCharCode(c.charCodeAt(0) - 0xfee0));
  return traditionalToSimplified(halfWidth.replace(/\s+/g, "")).toLowerCase();
}

/** Key used for duplicate detection and the shared dictionary cache. */
export function normalizeTerm(term: string, lang: LangCode): string {
  return lang === "zh" ? normalizeZh(term) : normalizeEn(term);
}
