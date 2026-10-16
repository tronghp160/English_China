import Papa from "papaparse";
import { pinyin } from "pinyin-pro";
import { lang as langDef } from "@/lib/lang/registry";
import type { LangCode } from "@/lib/lang/types";
import { segmentPinyin, stripTones } from "@/lib/lang/zh";

/**
 * Bulk import parser (docs/PLAN.md §7.7). Supported line formats:
 *   apple                      term only (AI fills everything)
 *   apple - quả táo            also ":", "=", tab, "–", "—"
 *   苹果 - quả táo
 *   苹果 píngguǒ quả táo        Chinese term, pinyin, meaning
 * and CSV with a header row (term, meaning_vi, reading…) or Excel paste (tabs).
 */

export type ParsedStatus = "ok" | "duplicate" | "error";

export type ParsedLine = {
  lineNo: number;
  raw: string;
  term: string;
  meaning_vi: string | null;
  reading: string | null;
  normalized: string;
  status: ParsedStatus;
  message?: string;
};

export type ParseResult = {
  lines: ParsedLine[];
  ok: ParsedLine[];
  duplicates: ParsedLine[];
  errors: ParsedLine[];
  truncated: boolean;
};

export const MAX_IMPORT = 100;

const BULLET = /^\s*(?:\d{1,3}[.)]\s+|[-*•·]\s+)/;
// " - " needs spaces so hyphenated words ("well-known") stay intact.
const SEPARATORS = [/\t+/, /\s+[-–—]\s+/, /\s*[–—]\s*/, /\s*[:：]\s*/, /\s*[=＝]\s*/];

const HAN = /\p{Script=Han}/u;
// Letters that only appear in Vietnamese (never in pinyin).
const VI_ONLY = /[ảạằắẳẵặầấẩẫậẻẽẹềếểễệỉĩịỏõọồốổỗộờớởỡợủũụừứửữựỳýỷỹỵđơưăâêô]/i;
const PINYIN_TOKEN = /^[a-zA-Züāáǎàēéěèīíǐìōóǒòūúǔùǖǘǚǜ'’]+[0-5]?$/;

function splitTermMeaning(line: string): [string, string | null] {
  for (const sep of SEPARATORS) {
    const m = line.match(sep);
    if (m && m.index === 0 && sep !== SEPARATORS[0]) return ["", line.slice(m[0].length).trim() || null];
    if (m && m.index !== undefined && m.index > 0) {
      const term = line.slice(0, m.index).trim();
      const meaning = line.slice(m.index + m[0].length).trim();
      if (term) return [term, meaning || null];
    }
  }
  return [line.trim(), null];
}

/** "苹果 píngguǒ quả táo" -> term 苹果, reading píngguǒ, meaning "quả táo". */
function splitChineseLine(line: string): { term: string; reading: string | null; meaning: string | null } {
  const m = line.match(/^([\p{Script=Han}·]+)\s*(.*)$/u);
  if (!m) return { term: line.trim(), reading: null, meaning: null };
  const term = m[1];
  const rest = m[2].trim();
  if (!rest) return { term, reading: null, meaning: null };
  const hanCount = [...term].filter((c) => HAN.test(c)).length;
  const tokens = rest.split(/\s+/);
  const readingTokens: string[] = [];
  let syllables = 0;
  for (const tok of tokens) {
    if (syllables >= hanCount) break;
    if (VI_ONLY.test(tok) || !PINYIN_TOKEN.test(tok)) break;
    const segs = segmentPinyin(tok);
    // must segment into real syllables (not one unparsed chunk unless it is one syllable)
    if (segs.length === 1 && segs[0] === tok && hanCount - syllables > 1 && tok.length > 6) break;
    readingTokens.push(tok);
    syllables += segs.length;
  }
  // Accept the tokens as pinyin only if they match how the characters can actually be read
  // ("你好 xin chào" is valid pinyin letters, but not the reading of 你好).
  const hanChars = [...term].filter((c) => HAN.test(c));
  const candidate = readingTokens.flatMap((t) => segmentPinyin(t)).map((syl) => stripTones(syl).replace(/v/g, "ü"));
  const matches =
    candidate.length === hanChars.length &&
    candidate.every((syl, i) =>
      pinyin(hanChars[i], { multiple: true, toneType: "none", type: "array", v: false })
        .map((x) => x.toLowerCase())
        .includes(syl),
    );
  if (!matches) return { term, reading: null, meaning: rest };
  const meaning = tokens.slice(readingTokens.length).join(" ").trim();
  return { term, reading: readingTokens.join(" "), meaning: meaning || null };
}

function looksLikeCsv(text: string): boolean {
  const first = text.split(/\r?\n/, 1)[0]?.toLowerCase() ?? "";
  return /(^|[,;\t])\s*"?(term|từ|word)"?\s*([,;\t]|$)/.test(first);
}

type RawEntry = { lineNo: number; raw: string; term: string; meaning: string | null; reading: string | null };

function parseCsv(text: string): RawEntry[] {
  const res = Papa.parse<Record<string, string>>(text.trim(), {
    header: true,
    skipEmptyLines: true,
    transformHeader: (h) => h.trim().toLowerCase(),
  });
  const pick = (row: Record<string, string>, keys: string[]) => {
    for (const k of keys) if (row[k]?.trim()) return row[k].trim();
    return null;
  };
  return res.data.map((row, i) => ({
    lineNo: i + 2,
    raw: Object.values(row).join(", "),
    term: pick(row, ["term", "từ", "word"]) ?? "",
    meaning: pick(row, ["meaning_vi", "meaning", "nghĩa", "nghia", "vi"]),
    reading: pick(row, ["reading", "pinyin", "ipa", "phiên âm"]),
  }));
}

function parseLines(text: string, language: LangCode): RawEntry[] {
  const out: RawEntry[] = [];
  text.split(/\r?\n/).forEach((rawLine, i) => {
    const line = rawLine.replace(BULLET, "").trim();
    if (!line || line.startsWith("#")) return;
    let [term, meaning] = splitTermMeaning(line);
    let reading: string | null = null;
    if (language === "zh") {
      // The term part may still carry pinyin: "苹果 píngguǒ - quả táo"
      const z = splitChineseLine(meaning === null ? line : term);
      term = z.term;
      reading = z.reading;
      if (meaning === null) meaning = z.meaning;
      else if (z.meaning) meaning = `${z.meaning} ${meaning}`.trim();
    }
    out.push({ lineNo: i + 1, raw: rawLine, term, meaning, reading });
  });
  return out;
}

export function parseImport(text: string, language: LangCode, existingNormalized: Iterable<string> = []): ParseResult {
  const def = langDef(language);
  const existing = new Set(existingNormalized);
  const seen = new Set<string>();
  const entries = looksLikeCsv(text) ? parseCsv(text) : parseLines(text, language);
  let okCount = 0;
  let truncated = false;

  const lines: ParsedLine[] = entries.map((e) => {
    const term = e.term.trim();
    const base = { lineNo: e.lineNo, raw: e.raw, term, meaning_vi: e.meaning, reading: e.reading };
    if (!term) return { ...base, normalized: "", status: "error", message: "Thiếu từ" };
    if (term.length > 80) return { ...base, normalized: "", status: "error", message: "Từ dài quá 80 ký tự" };
    if (e.meaning && e.meaning.length > 300) return { ...base, normalized: "", status: "error", message: "Nghĩa dài quá 300 ký tự" };
    if (language === "zh" && !HAN.test(term)) {
      return { ...base, normalized: "", status: "error", message: "Không thấy chữ Hán" };
    }
    if (language === "en" && HAN.test(term)) {
      return { ...base, normalized: "", status: "error", message: "Bộ này là tiếng Anh" };
    }
    const normalized = def.normalize(term);
    if (existing.has(normalized)) return { ...base, normalized, status: "duplicate", message: "Đã có trong bộ" };
    if (seen.has(normalized)) return { ...base, normalized, status: "duplicate", message: "Trùng dòng phía trên" };
    seen.add(normalized);
    if (okCount >= MAX_IMPORT) {
      truncated = true;
      return { ...base, normalized, status: "error", message: `Quá ${MAX_IMPORT} từ mỗi lần` };
    }
    okCount++;
    return { ...base, normalized, status: "ok" };
  });

  return {
    lines,
    ok: lines.filter((l) => l.status === "ok"),
    duplicates: lines.filter((l) => l.status === "duplicate"),
    errors: lines.filter((l) => l.status === "error"),
    truncated,
  };
}
