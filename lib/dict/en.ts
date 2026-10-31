import "server-only";
import type { EnrichEN } from "@/lib/ai/schemas";
import { publicEnv } from "@/lib/env";
import type { PosCode } from "@/lib/pos";

/**
 * Free English lookup:
 * - Vietnamese senses and examples from Vietnamese Wiktionary (CC BY-SA), whose
 *   English entries come from the Free Vietnamese Dictionary Project;
 * - IPA, English definitions, synonyms from dictionaryapi.dev (Wiktionary data).
 * Both are cached for 30 days by the fetch cache.
 */
const MONTH = 60 * 60 * 24 * 30;
const MAX_SENSES = 8; // Wiktionary does not order senses by frequency, so show a few more
const TIMEOUT_MS = 5000; // the word form; the tutor passes a shorter one

export type EnglishLookupOptions = { timeoutMs?: number };

const POS: Record<string, PosCode> = {
  noun: "noun",
  verb: "verb",
  adj: "adj",
  adv: "adv",
  prep: "prep",
  conj: "conj",
  intj: "interj",
  interj: "interj",
  pronoun: "pron",
  "def-article": "det",
  "indef-article": "det",
  art: "det",
  det: "det",
  num: "num",
  phrase: "phrase",
  idiom: "idiom",
  "phrasal-verb": "phrasal_verb",
};
// 3-letter section names that are not language codes ({{-eng-}}, {{-vie-}}, …).
const NOT_LANGUAGE = new Set(["adj", "adv", "ref", "art", "num", "det", "syn", "ant", "suf", "pre", "abb", "der"]);

function userAgent() {
  return `SoTu/1.0 (vocabulary notebook; ${publicEnv().NEXT_PUBLIC_SITE_URL})`;
}

async function getText(url: string, timeoutMs = TIMEOUT_MS): Promise<string | null> {
  try {
    const res = await fetch(url, {
      headers: { "User-Agent": userAgent() },
      signal: AbortSignal.timeout(timeoutMs),
      next: { revalidate: MONTH },
    });
    return res.ok ? await res.text() : null;
  } catch {
    return null;
  }
}

/** Wiki markup → plain text: [[a|B]] → B, {{term|Âm nhạc}} → (âm nhạc), no quotes/templates. */
export function wikiToText(s: string): string {
  return s
    .replace(/\{\{term\|([^}|]+)[^}]*\}\}/g, (_, t: string) => `(${t.toLowerCase()})`)
    .replace(/\{\{[^{}]*\}\}/g, "")
    .replace(/\[\[(?:[^\]|]*\|)?([^\]]*)\]\]/g, "$1")
    .replace(/'{2,}/g, "")
    .replace(/<[^>]+>/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

/** Lower-case the first letter ("Bờ (sông…)" → "bờ (sông…)") unless it starts an acronym. */
function lowerFirst(s: string) {
  return /^\p{Lu}\p{Lu}/u.test(s) ? s : s.charAt(0).toLocaleLowerCase("vi") + s.slice(1);
}

type WikiSense = { pos: PosCode; meaning: string; examples: { text: string; vi: string }[]; labelled: boolean };
export type WikiEntry = { ipa: string | null; senses: WikiSense[]; expressions: { text: string; vi: string }[] };

/** Parse the English section of a Vietnamese Wiktionary page (raw wikitext). */
export function parseViWiktionary(raw: string): WikiEntry | null {
  const start = raw.indexOf("{{-eng-}}");
  if (start < 0) return null;
  const lines = raw.slice(start + "{{-eng-}}".length).split("\n");
  const out: WikiEntry = { ipa: null, senses: [], expressions: [] };
  let section = "";
  for (const line of lines) {
    const head = /^\{\{-([a-z-]+)-\}\}\s*$/.exec(line.trim());
    if (head) {
      const name = head[1];
      if (/^[a-z]{3}$/.test(name) && !NOT_LANGUAGE.has(name)) break; // next language
      section = name;
      continue;
    }
    if (!out.ipa) {
      const ipa = /\{\{IPA[^}]*?(\/[^/}]+\/)/.exec(line);
      if (ipa) out.ipa = ipa[1];
    }
    const pos = POS[section];
    if (pos && /^#[^:*#]/.test(line)) {
      const meaning = wikiToText(line.slice(1)).replace(/\.$/, "");
      if (meaning) {
        out.senses.push({ pos, meaning: lowerFirst(meaning), examples: [], labelled: /\{\{term\|/.test(line) });
      }
    } else if (pos && line.startsWith("#:")) {
      const [en, vi = ""] = line.slice(2).split(/\s+[—–-]\s+/);
      const text = wikiToText(en);
      const last = out.senses.at(-1);
      if (last && text) last.examples.push({ text, vi: wikiToText(vi) });
    } else if (section === "expr" && line.startsWith("*")) {
      const m = /^\*\s*'''(.+?)'''\s*:\s*(.+)$/.exec(line);
      if (m) out.expressions.push({ text: wikiToText(m[1]), vi: lowerFirst(wikiToText(m[2])).replace(/\.$/, "") });
    }
  }
  return out.senses.length || out.ipa ? out : null;
}

type FreeDictEntry = {
  phonetic?: string;
  phonetics?: { text?: string; audio?: string }[];
  meanings?: {
    partOfSpeech: string;
    definitions: { definition: string; example?: string }[];
    synonyms?: string[];
    antonyms?: string[];
  }[];
};

const FREE_POS: Record<string, PosCode> = {
  noun: "noun",
  verb: "verb",
  adjective: "adj",
  adverb: "adv",
  preposition: "prep",
  conjunction: "conj",
  interjection: "interj",
  pronoun: "pron",
  determiner: "det",
  article: "det",
  numeral: "num",
};

async function viWiktionary(term: string, timeoutMs?: number) {
  const tries = [...new Set([term, term.toLowerCase()])];
  for (const t of tries) {
    const raw = await getText(`https://vi.wiktionary.org/w/index.php?title=${encodeURIComponent(t)}&action=raw`, timeoutMs);
    const parsed = raw ? parseViWiktionary(raw) : null;
    if (parsed) return parsed;
  }
  return null;
}

async function freeDictionary(term: string, timeoutMs?: number): Promise<FreeDictEntry[] | null> {
  const body = await getText(`https://api.dictionaryapi.dev/api/v2/entries/en/${encodeURIComponent(term.toLowerCase())}`, timeoutMs);
  if (!body) return null;
  try {
    const json = JSON.parse(body);
    return Array.isArray(json) ? (json as FreeDictEntry[]) : null;
  } catch {
    return null;
  }
}

/** Free entry for an English word, or null when neither source knows it. */
export async function lookupEnglish(term: string, opts: EnglishLookupOptions = {}): Promise<EnrichEN | null> {
  const word = term.trim();
  const [wiki, free] = await Promise.all([viWiktionary(word, opts.timeoutMs), freeDictionary(word, opts.timeoutMs)]);
  if (!wiki && !free) return null;

  const meanings = (free ?? []).flatMap((e) => e.meanings ?? []);
  const firstDef = new Map<PosCode, { definition: string; example?: string }>();
  for (const m of meanings) {
    const pos = FREE_POS[m.partOfSpeech];
    if (pos && !firstDef.has(pos) && m.definitions[0]) firstDef.set(pos, m.definitions[0]);
  }
  const rawIpa =
    free?.flatMap((e) => e.phonetics ?? []).find((p) => p.text && p.audio?.includes("-us"))?.text ??
    free?.find((e) => e.phonetic)?.phonetic ??
    wiki?.ipa ??
    "";
  // Some entries write stress with ASCII quotes: /rɪ'zɪliənt/ → /rɪˈzɪliənt/.
  const ipa = rawIpa.replace(/'/g, "ˈ").replace(/(?<=\S),(?=\S)/g, "ˌ");

  // Specialised senses ("(ngành mỏ) …") go last; Wiktionary has no frequency order.
  const wikiSenses = [...(wiki?.senses ?? [])].sort((a, b) => Number(a.labelled) - Number(b.labelled));
  const seenPos = new Set<PosCode>();
  const senses: EnrichEN["senses"] = wikiSenses.slice(0, MAX_SENSES).map((s) => {
    const def = seenPos.has(s.pos) ? undefined : firstDef.get(s.pos);
    seenPos.add(s.pos);
    return {
      pos: [s.pos],
      meaning_vi: s.meaning,
      meaning_en: def?.definition ?? "",
      examples: s.examples.slice(0, 3).map((x) => ({ text: x.text, reading: null, vi: x.vi })),
      image_query: "",
    };
  });
  // No Vietnamese entry: still give the English definitions so the form gets IPA and examples.
  if (!senses.length) {
    for (const [pos, def] of firstDef) {
      senses.push({
        pos: [pos],
        meaning_vi: "",
        meaning_en: def.definition,
        examples: def.example ? [{ text: def.example, reading: null, vi: "" }] : [],
        image_query: "",
      });
    }
  }
  if (!senses.length) return null;

  const uniq = (list: string[]) => [...new Set(list.map((x) => x.trim()).filter(Boolean))];
  return {
    is_valid_word: true,
    did_you_mean: null,
    lemma: word,
    ipa_us: ipa,
    ipa_uk: null,
    cefr: null,
    senses,
    synonyms: uniq(meanings.flatMap((m) => m.synonyms ?? [])),
    antonyms: uniq(meanings.flatMap((m) => m.antonyms ?? [])),
    collocations: (wiki?.expressions ?? []).slice(0, 5),
    word_family: [],
    verb_forms: null,
    plural: null,
    topic_vi: "",
    emoji: "",
    image_query: word,
    memory_tip_vi: null,
  };
}
