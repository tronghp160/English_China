import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { MessageCircleHeart, PenLine, Pencil, Plus } from "lucide-react";
import { BackLink } from "@/components/app-shell/back-link";
import { StatusDot } from "@/components/deck/status-dot";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ImageCredit } from "@/components/word/image-picker";
import { PosBadge } from "@/components/word/pos-badge";
import { PronounceButton } from "@/components/word/pronounce-button";
import { SuspendToggle } from "@/components/word/suspend-toggle";
import { WordHero } from "@/components/word/word-hero";
import { PinyinText } from "@/components/zh/pinyin-text";
import { StrokeOrder } from "@/components/zh/stroke-order";
import { startChat } from "@/lib/actions/chat";
import { getMe } from "@/lib/auth";
import { getDeck } from "@/lib/data/decks";
import { getWord } from "@/lib/data/words";
import { aiProvider } from "@/lib/env";
import { formatRelativeDue, formatShortDate } from "@/lib/format";
import { LANGUAGES } from "@/lib/lang/registry";
import { POS, isPosCode } from "@/lib/pos";
import { createClient } from "@/lib/supabase/server";
import { cn } from "@/lib/utils";
import { readPrefs } from "@/lib/validation";
import { collocationsOf, examplesOf, extraOf, familyOf, imageSourceOf } from "@/lib/word-mapper";

export async function generateMetadata({ params }: PageProps<"/words/[wordId]">): Promise<Metadata> {
  const word = await getWord((await params).wordId);
  return { title: word?.term ?? "Từ" };
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-lg border border-border/60 bg-surface p-5 shadow-sm dark:border-border">
      <h2 className="mb-3 text-lg">{title}</h2>
      {children}
    </section>
  );
}

/** The studied word inside an example sentence is bold and blue, the one place it carries meaning. */
function Highlighted({ text, term }: { text: string; term: string }) {
  const t = term.trim();
  if (!t) return text;
  const parts = text.split(new RegExp(`(${t.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")})`, "gi"));
  return parts.map((p, i) => (p.toLowerCase() === t.toLowerCase() ? <mark key={i} className="bg-transparent font-bold text-primary-fg">{p}</mark> : p));
}

export default async function WordPage({ params }: PageProps<"/words/[wordId]">) {
  const { wordId } = await params;
  const word = await getWord(wordId);
  if (!word) notFound();
  const [view, me] = await Promise.all([getDeck(word.deck_id), getMe()]);
  if (!view) notFound();
  const prefs = readPrefs(me?.settings.prefs);
  const toneColors = prefs.tone_colors;
  const lang = word.language;
  const def = LANGUAGES[lang];
  const extra = extraOf(word);
  const examples = examplesOf(word);
  const collocations = collocationsOf(word);
  const family = familyOf(word);
  const isZh = lang === "zh";

  const supabase = await createClient();
  const related = [...word.synonyms, ...word.antonyms];
  const [{ data: progress }, { data: existing }] = await Promise.all([
    supabase.rpc("word_progress", { p_word_id: wordId }),
    related.length
      ? supabase
          .from("words")
          .select("id, normalized")
          .eq("deck_id", word.deck_id)
          .in("normalized", related.map((r) => def.normalize(r)))
      : Promise.resolve({ data: [] as { id: string; normalized: string }[] }),
  ]);
  const existingMap = new Map((existing ?? []).map((e) => [e.normalized, e.id]));
  const recognize = progress?.find((p) => p.direction === "recognize");
  const chars = isZh ? [...word.term].filter((c) => /\p{Script=Han}/u.test(c)) : [];
  const charInfo = new Map((extra.characters ?? []).map((c) => [c.char, c]));

  function RelatedChip({ text }: { text: string }) {
    const id = existingMap.get(def.normalize(text));
    if (id) {
      return (
        <Link href={`/words/${id}`} className="inline-flex min-h-10 items-center rounded-full bg-primary-soft px-3 text-sm text-fg">
          {text}
        </Link>
      );
    }
    return view!.canEdit ? (
      <Link
        href={`/decks/${word!.deck_id}/add?term=${encodeURIComponent(text)}`}
        className="inline-flex min-h-10 items-center gap-1 rounded-full border border-dashed border-border-strong px-3 text-sm text-fg-muted hover:text-fg"
        title="Thêm từ này"
      >
        <Plus className="size-3.5" aria-hidden />
        {text}
      </Link>
    ) : (
      <span className="inline-flex min-h-10 items-center rounded-full border border-border-strong px-3 text-sm text-fg">{text}</span>
    );
  }

  return (
    <article className="max-w-3xl">
      <BackLink href={`/decks/${word.deck_id}`} label={view.deck.name} />

      <header>
        <WordHero
          lang={lang}
          term={word.term}
          reading={word.reading}
          readingNode={
            !isZh && extra.uk_ipa && extra.uk_ipa !== extra.us_ipa ? (
              <>
                <span>
                  <abbr title="Anh-Mỹ" className="mr-1 no-underline">US</abbr>
                  {extra.us_ipa ?? word.reading}
                </span>
                <span>
                  <abbr title="Anh-Anh" className="mr-1 no-underline">UK</abbr>
                  {extra.uk_ipa}
                </span>
              </>
            ) : undefined
          }
          toneColors={toneColors}
          actions={<PronounceButton text={word.term} lang={lang} size="lg" />}
          aside={
            word.image_url ? (
              <div className="relative size-24 overflow-hidden rounded-lg border border-border sm:size-32">
                <Image src={word.image_url} alt="" fill sizes="128px" className="object-cover" />
              </div>
            ) : word.emoji ? (
              <span className="grid size-20 place-items-center rounded-lg bg-surface-2 text-5xl" aria-hidden>
                {word.emoji}
              </span>
            ) : null
          }
        >
          {isZh && extra.traditional && extra.traditional !== word.term && (
            <p className="text-sm text-fg-muted">
              Phồn thể <span lang="zh-TW" className="ml-1 font-hanzi text-xl text-fg">{extra.traditional}</span>
            </p>
          )}
        </WordHero>
        <h1 className="sr-only">{word.term}</h1>
        <ImageCredit source={imageSourceOf(word)} className="mt-2 text-right" />

        <div className="mt-4 flex flex-wrap items-center gap-2">
          {word.parts_of_speech.map((p) => (
            <PosBadge key={p} pos={p} />
          ))}
          {extra.cefr && <Badge variant="secondary">{extra.cefr}</Badge>}
          {extra.hsk?.level && <Badge variant="destructive">HSK {extra.hsk.level}</Badge>}
          {word.topic && <Badge variant="outline">Chủ đề: {word.topic}</Badge>}
        </div>

        <p className="mt-5 text-[1.5rem] leading-snug font-extrabold tracking-[-0.02em] text-fg">{word.meaning_vi}</p>
        {word.meaning_en && <p className="mt-1 text-fg-muted">{word.meaning_en}</p>}
        {isZh && extra.han_viet && (
          <p className="mt-2 text-sm text-fg-muted">
            Hán Việt: <span className="font-medium text-fg">{extra.han_viet}</span>
          </p>
        )}
        {isZh && extra.measure_words && extra.measure_words.length > 0 && (
          <p className="mt-1 text-sm text-fg-muted">
            Lượng từ:{" "}
            {extra.measure_words.map((m, i) => (
              <span key={m.char} className="text-fg">
                {i > 0 && ", "}
                <span className="font-hanzi-sans">{m.char}</span> <PinyinText pinyin={m.pinyin} colored={toneColors} />
              </span>
            ))}
          </p>
        )}
        {extra.needs_review && (
          <p className="mt-3 rounded-md bg-streak-soft px-3 py-2 text-sm text-streak-fg">Pinyin có chữ đa âm, nên kiểm tra lại.</p>
        )}

        <div className="mt-5 flex flex-wrap gap-2">
          {view.canEdit && (
            <Button asChild variant="outline">
              <Link href={`/words/${wordId}/edit`}>
                <Pencil aria-hidden />
                Sửa
              </Link>
            </Button>
          )}
          {isZh && (
            <Button asChild variant="outline">
              <Link href={`/practice/writing?word=${wordId}`}>
                <PenLine aria-hidden />
                Tập viết
              </Link>
            </Button>
          )}
          {aiProvider() !== null && (
            <form action={startChat}>
              <input type="hidden" name="language" value={word.language} />
              <input type="hidden" name="deck_id" value={word.deck_id} />
              <input
                type="hidden"
                name="prompt"
                value={`Giải thích kỹ hơn giúp mình từ "${word.term}" (${word.meaning_vi}): cách dùng, từ hay nhầm, và cho mình đặt thử một câu.`}
              />
              <Button type="submit" variant="soft" tone="grape">
                <MessageCircleHeart aria-hidden />
                Hỏi gia sư
              </Button>
            </form>
          )}
        </div>
      </header>

      <div className="mt-4 flex flex-col gap-4">
        {examples.length > 0 && (
          <Section title="Câu ví dụ">
            <ul className="space-y-4">
              {examples.map((e, i) => (
                <li key={i} className={cn("flex gap-2 border-l-2 pl-3", isZh ? "border-zh" : "border-primary")}>
                  <div className="min-w-0 flex-1">
                    <p lang={isZh ? "zh-CN" : "en"} className={isZh ? "font-hanzi text-lg text-fg" : "text-fg"}>
                      <Highlighted text={e.text} term={word.term} />
                    </p>
                    {isZh && e.reading && <PinyinText pinyin={e.reading} colored={toneColors} className="block text-sm" />}
                    {e.vi && <p className="text-sm text-fg-muted">{e.vi}</p>}
                  </div>
                  <PronounceButton text={e.text} lang={lang} size="sm" label={`Đọc câu ví dụ ${i + 1}`} />
                </li>
              ))}
            </ul>
          </Section>
        )}

        {chars.length > 0 && (
          <Section title="Từng chữ">
            <ul className="grid gap-4 sm:grid-cols-2">
              {chars.map((c, i) => {
                const info = charInfo.get(c);
                return (
                  <li key={`${c}-${i}`} className="flex items-center gap-4">
                    <StrokeOrder char={c} />
                    <div className="min-w-0 text-sm">
                      <p className="font-hanzi text-2xl text-fg" lang="zh-CN">
                        {c}
                      </p>
                      {info?.pinyin && <PinyinText pinyin={info.pinyin} colored={toneColors} className="text-base font-medium" />}
                      {info?.meaning_vi && <p className="text-fg">{info.meaning_vi}</p>}
                      {info?.radical && (
                        <p className="text-fg-muted">
                          Bộ thủ: <span className="font-hanzi-sans text-fg">{info.radical}</span>
                        </p>
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>
          </Section>
        )}

        {collocations.length > 0 && (
          <Section title="Cụm từ thường gặp">
            <ul className="divide-y divide-border">
              {collocations.map((c, i) => (
                <li key={i} className="flex items-center gap-2 py-2.5">
                  <div className="min-w-0 flex-1">
                    <p className={isZh ? "font-hanzi-sans text-fg" : "font-medium text-fg"}>
                      {c.text}
                      {isZh && c.reading && <PinyinText pinyin={c.reading} colored={toneColors} className="ml-2 text-sm font-normal" />}
                    </p>
                    {c.vi && <p className="text-sm text-fg-muted">{c.vi}</p>}
                  </div>
                  <PronounceButton text={c.text} lang={lang} size="sm" label={`Đọc cụm từ ${c.text}`} />
                </li>
              ))}
            </ul>
          </Section>
        )}

        {(word.synonyms.length > 0 || word.antonyms.length > 0) && (
          <Section title="Đồng nghĩa và trái nghĩa">
            {word.synonyms.length > 0 && (
              <div className="flex flex-wrap items-center gap-2">
                <span className="w-20 text-sm text-fg-muted">Đồng nghĩa</span>
                {word.synonyms.map((s) => (
                  <RelatedChip key={s} text={s} />
                ))}
              </div>
            )}
            {word.antonyms.length > 0 && (
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <span className="w-20 text-sm text-fg-muted">Trái nghĩa</span>
                {word.antonyms.map((s) => (
                  <RelatedChip key={s} text={s} />
                ))}
              </div>
            )}
          </Section>
        )}

        {(family.length > 0 || extra.verb_forms || extra.plural) && (
          <Section title="Họ từ và dạng từ">
            {family.length > 0 && (
              <ul className="divide-y divide-border">
                {family.map((f, i) => (
                  <li key={i} className="flex flex-wrap items-baseline gap-x-2 py-2">
                    <span className="font-medium text-fg">{f.text}</span>
                    {f.pos && isPosCode(f.pos) && <span className="text-xs text-fg-muted">{POS[f.pos].label}</span>}
                    <span className="text-sm text-fg-muted">{f.vi}</span>
                  </li>
                ))}
              </ul>
            )}
            {extra.verb_forms && (
              <p className="mt-3 text-sm text-fg-muted">
                Động từ:{" "}
                <span className="text-fg">
                  {[extra.verb_forms.past, extra.verb_forms.past_participle, extra.verb_forms.ing, extra.verb_forms.third_person].join(", ")}
                </span>
              </p>
            )}
            {extra.plural && (
              <p className="mt-1 text-sm text-fg-muted">
                Số nhiều: <span className="text-fg">{extra.plural}</span>
              </p>
            )}
          </Section>
        )}

        {word.personal_note && (
          <Section title="Ghi chú riêng">
            <p className="rounded-md bg-streak-soft px-4 py-3 whitespace-pre-line text-streak-fg">{word.personal_note}</p>
          </Section>
        )}

        <Section title="Tiến độ của bạn">
          {recognize ? (
            <div className="space-y-1.5 text-sm">
              <StatusDot state={recognize.state} lapses={recognize.lapses} suspended={recognize.suspended} withLabel />
              <p className="text-fg-muted">
                Lần ôn gần nhất: <span className="text-fg">{recognize.last_review ? formatShortDate(recognize.last_review) : "chưa ôn"}</span>
              </p>
              {recognize.state !== "new" && (
                <p className="text-fg-muted">
                  Lần tới: <span className="text-fg">{formatRelativeDue(recognize.due)}</span>
                </p>
              )}
              <p className="flex flex-wrap gap-x-4 text-fg-muted">
                <span>Đã ôn {recognize.reps} lần</span>
                <span>quên {recognize.lapses} lần</span>
              </p>
            </div>
          ) : (
            <p className="text-sm text-fg-muted">Bạn chưa học từ này.</p>
          )}
          <SuspendToggle wordId={wordId} deckId={word.deck_id} suspended={Boolean(recognize?.suspended)} />
        </Section>
      </div>
    </article>
  );
}
