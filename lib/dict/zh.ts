import "server-only";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { gunzipSync } from "node:zlib";
import { convert } from "pinyin-pro";
import type { EnrichZH } from "@/lib/ai/schemas";

/**
 * Free Chinese–Vietnamese lookup from CVDICT (github.com/ph0ngp/CVDICT, CC BY-SA 4.0),
 * a Vietnamese translation of CC-CEDICT. The file is parsed once per server process.
 */
type Entry = { trad: string; simp: string; pinyin: string; senses: string[] };

const FILE = path.join(process.cwd(), "data", "cvdict.u8.gz");
const LINE = /^(\S+) (\S+) \[([^\]]*)\] \/(.*)\/\s*$/;
const MAX_SENSES = 6;

let index: Promise<Map<string, Entry[]>> | null = null;

function load() {
  index ??= readFile(FILE)
    .then((gz) => {
      const map = new Map<string, Entry[]>();
      for (const line of gunzipSync(gz).toString("utf8").split("\n")) {
        if (!line || line.startsWith("#")) continue;
        const m = LINE.exec(line);
        if (!m) continue;
        const e: Entry = { trad: m[1], simp: m[2], pinyin: m[3], senses: m[4].split("/").filter(Boolean) };
        for (const key of new Set([e.simp, e.trad])) {
          const list = map.get(key);
          if (list) list.push(e);
          else map.set(key, [e]);
        }
      }
      return map;
    })
    .catch((err) => {
      index = null; // try again on the next request
      throw err;
    });
  return index;
}

/** "jian1 qiang2" → "jiān qiáng" (CEDICT writes ü as u: and the neutral tone as 5). */
export function numberedToMarks(numbered: string): string {
  return convert(numbered.replace(/u:/g, "v").replace(/5\b/g, ""), { format: "numToSymbol" }).replace(
    /v/g,
    "ü",
  );
}

/** "LT:家[jia1],個|个[ge4]" → measure words; null if the sense is not a measure-word list. */
function measureWords(sense: string): EnrichZH["measure_words"] | null {
  if (!sense.startsWith("LT:")) return null;
  return [...sense.slice(3).matchAll(/(?:[^|,[\]]+\|)?([^|,[\]]+)\[([^\]]+)\]/g)].map((m) => ({
    char: m[1],
    pinyin: numberedToMarks(m[2]),
  }));
}

/** Cross references like 堅強|坚强[jian1 qiang2] → 坚强. */
function cleanSense(sense: string) {
  return sense.replace(/(?:[^\s|[\]]+\|)?(\p{Script=Han}+)\[[^\]]+\]/gu, "$1").trim();
}

/** Free entry for a Chinese word, or null when CVDICT does not have it. */
export async function lookupChinese(term: string): Promise<EnrichZH | null> {
  const map = await load();
  const entries = map.get(term.trim());
  if (!entries?.length) return null;
  // Prefer common readings over surnames and place names (capitalised pinyin).
  const sorted = [...entries].sort((a, b) => Number(/^[A-Z]/.test(a.pinyin)) - Number(/^[A-Z]/.test(b.pinyin)));
  const main = sorted[0];
  // Other readings of the same characters (好吃 hào chī) are different words: keep one reading.
  const same = sorted.filter((e) => e.pinyin.toLowerCase() === main.pinyin.toLowerCase());

  const measure: EnrichZH["measure_words"] = [];
  const meanings: string[] = [];
  for (const e of same) {
    for (const s of e.senses) {
      const mw = measureWords(s);
      if (mw) measure.push(...mw);
      else if (/^(họ|tên họ) /i.test(s) && same.length > 1) continue; // "họ [Qiang2]"
      else meanings.push(cleanSense(s));
    }
  }
  const unique = [...new Set(meanings.filter(Boolean))].slice(0, MAX_SENSES);
  if (!unique.length) return null;

  const chars = [...main.simp].filter((c) => /\p{Script=Han}/u.test(c));
  const characters = chars.length > 1
    ? chars.map((c) => {
        const e = map.get(c)?.find((x) => !/^[A-Z]/.test(x.pinyin)) ?? map.get(c)?.[0];
        return {
          char: c,
          pinyin: e ? numberedToMarks(e.pinyin) : "",
          meaning_vi: e ? cleanSense(e.senses[0] ?? "").split(";")[0].slice(0, 60) : "",
          radical: "",
        };
      })
    : [];

  return {
    is_valid_word: true,
    did_you_mean: null,
    simplified: main.simp,
    traditional: main.trad,
    pinyin: numberedToMarks(main.pinyin).replace(/\s+/g, ""),
    pinyin_numbered: main.pinyin.replace(/u:/g, "v"),
    hsk: null,
    senses: unique.map((m) => ({ pos: [], meaning_vi: m, meaning_en: "", examples: [], image_query: "" })),
    measure_words: [...new Map(measure.map((m) => [m.char, m])).values()],
    characters,
    synonyms: [],
    antonyms: [],
    collocations: [],
    han_viet: null,
    topic_vi: "",
    emoji: "",
    image_query: "",
    memory_tip_vi: null,
  };
}
