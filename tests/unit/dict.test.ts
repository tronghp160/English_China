import { describe, expect, it } from "vitest";
import { parseViWiktionary, wikiToText } from "@/lib/dict/en";
import { lookupChinese, numberedToMarks } from "@/lib/dict/zh";

// Trimmed copy of vi.wiktionary.org "bank" (raw wikitext): a Vietnamese section
// would come first on pages like "he"; another language follows the English one.
const BANK = `{{also|Bank}}
{{-eng-}}

{{-pron-}}
* {{IPA4|en|/bæŋk/}}

{{-noun-}}
'''bank'''  {{IPA-old|/ˈbæŋk/}}
# Đê, [[gờ]], ụ (đất, đá).
# [[bờ|Bờ]] (sông, hồ, kênh, lạch, ruộng... ).
#: ''big banks of snow'' —  những đống tuyết lớn
# {{term|Ngành mỏ}} [[bờ|Bờ]] [[miệng]] [[giếng]].
# [[nhà|Nhà]] [[ngân hàng]].

{{-expr-}}
* '''can take it to the bank''': đúng sự thật

{{-verb-}}
# [[gửi|Gửi]] (tiền) vào [[ngân hàng]].
#: ''he banks one tenth of his salary'' —  anh ta gửi một phần mười tiền lương

{{-ref-}}
{{R:FVDP}}

{{-uzb-}}

{{-noun-}}
# [[ngân hàng]].`;

describe("Vietnamese Wiktionary parser", () => {
  it("strips wiki markup", () => {
    expect(wikiToText("[[nhà|Nhà]] [[ngân hàng]]")).toBe("Nhà ngân hàng");
    expect(wikiToText("{{term|Âm nhạc}} [[bàn phím|Bàn phím]].")).toBe("(âm nhạc) Bàn phím.");
    expect(wikiToText("''to '''bank''' up''")).toBe("to bank up");
  });

  it("reads only the English section, with senses, examples and expressions", () => {
    const e = parseViWiktionary(BANK)!;
    expect(e.ipa).toBe("/bæŋk/");
    expect(e.senses.map((s) => [s.pos, s.meaning])).toEqual([
      ["noun", "đê, gờ, ụ (đất, đá)"],
      ["noun", "bờ (sông, hồ, kênh, lạch, ruộng... )"],
      ["noun", "(ngành mỏ) Bờ miệng giếng"],
      ["noun", "nhà ngân hàng"],
      ["verb", "gửi (tiền) vào ngân hàng"],
    ]);
    expect(e.senses[1].examples).toEqual([{ text: "big banks of snow", vi: "những đống tuyết lớn" }]);
    expect(e.senses[2].labelled).toBe(true);
    expect(e.expressions).toEqual([{ text: "can take it to the bank", vi: "đúng sự thật" }]);
  });

  it("returns null without an English section", () => {
    expect(parseViWiktionary("{{-vie-}}\n{{-noun-}}\n# Đồ dệt.")).toBeNull();
  });
});

describe("CVDICT lookup", () => {
  it("converts CEDICT pinyin", () => {
    expect(numberedToMarks("jian1 qiang2")).toBe("jiān qiáng");
    expect(numberedToMarks("lu:4 nu:3 er5")).toBe("lǜ nǚ er");
  });

  it("finds a word by simplified or traditional form, with measure words", async () => {
    const bank = await lookupChinese("银行");
    expect(bank).toMatchObject({ simplified: "银行", traditional: "銀行", pinyin: "yínháng", pinyin_numbered: "yin2 hang2" });
    expect(bank!.senses[0].meaning_vi).toBe("ngân hàng");
    expect(bank!.measure_words.map((m) => m.char)).toEqual(["家", "个"]);
    expect(bank!.characters.map((c) => c.char)).toEqual(["银", "行"]);
    expect((await lookupChinese("銀行"))!.simplified).toBe("银行");
  });

  it("keeps one reading of a word written the same way", async () => {
    const r = await lookupChinese("好吃");
    expect(r!.pinyin).toBe("hǎochī");
    expect(r!.senses.map((s) => s.meaning_vi)).toEqual(["ngon; ngon miệng"]);
  });

  it("returns null for unknown words", async () => {
    expect(await lookupChinese("不存在的词语啊")).toBeNull();
  });
});
