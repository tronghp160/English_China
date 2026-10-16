import "server-only";
import { Converter } from "opencc-js/cn2t";
import { pinyin } from "pinyin-pro";
import { markedToNumbered, segmentPinyin } from "@/lib/lang/zh";
import type { EnrichChecks, EnrichZH } from "./schemas";

let toTraditional: ((s: string) => string) | undefined;

function compact(p: string) {
  return p.normalize("NFC").toLowerCase().replace(/[\s'’·-]/g, "");
}

function readingsOf(char: string) {
  return pinyin(char, { multiple: true, type: "array" }).map((o) => o.normalize("NFC").toLowerCase());
}

/** Every AI syllable is a reading the character really has (e.g. 强 qiǎng). */
function plausibleReading(chars: string[], aiPinyin: string) {
  const syllables = segmentPinyin(aiPinyin).map((x) => x.normalize("NFC").toLowerCase());
  return syllables.length === chars.length && syllables.every((syl, i) => readingsOf(chars[i]).includes(syl));
}

/**
 * Cross-check AI output for Chinese words (§7.2 "Kiểm tra lại sau AI"):
 * - pinyin vs pinyin-pro: when they differ but the AI reading is a real reading
 *   of each (polyphonic) character, keep it and flag for review; otherwise the
 *   AI pinyin is wrong and pinyin-pro wins;
 * - traditional form vs opencc-js.
 */
export function verifyChinese(r: EnrichZH): { result: EnrichZH; checks: EnrichChecks } {
  const checks: EnrichChecks = {};
  const out = { ...r };
  const chars = [...r.simplified].filter((c) => /\p{Script=Han}/u.test(c));

  if (chars.length) {
    const generatedSyllables = pinyin(r.simplified, { toneSandhi: false, type: "array" }).filter((s) => s.trim());
    const generated = generatedSyllables.join("");
    if (compact(generated) !== compact(r.pinyin)) {
      if (plausibleReading(chars, r.pinyin)) {
        checks.pinyin_needs_review = true;
      } else {
        out.pinyin = generated;
        out.pinyin_numbered = markedToNumbered(generatedSyllables);
        checks.pinyin_corrected = true;
      }
    } else if (!r.pinyin_numbered.trim()) {
      out.pinyin_numbered = markedToNumbered(segmentPinyin(r.pinyin));
    }
    // Normalize numbered form: neutral tone as 5, lowercase, single spaces.
    out.pinyin_numbered = out.pinyin_numbered
      .toLowerCase()
      .replace(/([a-zü])0/g, "$15")
      .replace(/\s+/g, " ")
      .trim();
    if (!/\d/.test(out.pinyin_numbered)) {
      out.pinyin_numbered = markedToNumbered(segmentPinyin(out.pinyin));
    }
  }

  toTraditional ??= Converter({ from: "cn", to: "tw" });
  const trad = toTraditional(r.simplified);
  if (trad && trad !== r.traditional) {
    out.traditional = trad;
    checks.traditional_corrected = true;
  }

  // Keep the per-character readings consistent with the (possibly corrected) word pinyin.
  const syllables = segmentPinyin(out.pinyin);
  if (syllables.length === chars.length) {
    out.characters = out.characters.map((c, i) =>
      chars[i] === c.char && !c.pinyin.trim() ? { ...c, pinyin: syllables[i] } : c,
    );
  }
  return { result: out, checks };
}
