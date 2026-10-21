import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { MessageCircleHeart, PenLine, Pencil, Plus } from "lucide-react";
import { BackLink } from "@/components/app-shell/back-link";
import { StatusDot } from "@/components/deck/status-dot";
import { ImageCredit } from "@/components/word/image-picker";
import { PosBadge } from "@/components/word/pos-badge";
import { PronounceButton } from "@/components/word/pronounce-button";
import { SuspendToggle } from "@/components/word/suspend-toggle";
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
import { readPrefs } from "@/lib/validation";
import { collocationsOf, examplesOf, extraOf, familyOf, imageSourceOf } from "@/lib/word-mapper";

export async function generateMetadata({ params }: PageProps<"/words/[wordId]">): Promise<Metadata> {
  const word = await getWord((await params).wordId);
  return { title: word?.term ?? "Từ" };
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="border-t border-rule py-5">
      <h2 className="mb-3 text-sm font-medium text-ink-soft">{title}</h2>
      {children}
    </section>
  );
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
        <Link href={`/words/${id}`} className="inline-flex min-h-10 items-center rounded-full bg-wash-blue px-3 text-sm text-ink">
          {text}
        </Link>
      );
    }
    return view!.canEdit ? (
      <Link
        href={`/decks/${word!.deck_id}/add?term=${encodeURIComponent(text)}`}
        className="inline-flex min-h-10 items-center gap-1 rounded-full border border-dashed border-rule px-3 text-sm text-ink-soft hover:text-ink"
        title="Thêm từ này"
      >
        <Plus className="size-3.5" aria-hidden />
        {text}
      </Link>
    ) : (
      <span className="inline-flex min-h-10 items-center rounded-full border border-rule px-3 text-sm text-ink">{text}</span>
    );
  }

  return (
    <article className="mx-auto max-w-2xl">
      <BackLink href={`/decks/${word.deck_id}`} label={view.deck.name} />

      <div className="notebook-card px-5 py-6 sm:px-7">
        <div className="flex items-start gap-4">
          <div className="min-w-0 flex-1">
            <h1 lang={isZh ? "zh-CN" : "en"} className="flex flex-wrap items-end gap-3">
              <span className={`ruled-word font-bold break-words text-ink ${isZh ? "font-hanzi text-[3.5rem] leading-none" : "text-[2.5rem] leading-tight"}`}>
                {word.term}
              </span>
              {isZh && extra.traditional && extra.traditional !== word.term && (
                <span className="font-hanzi text-2xl text-ink-soft" title="Phồn thể">
                  {extra.traditional}
                </span>
              )}
            </h1>
            <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1">
              {word.reading &&
                (isZh ? (
                  <PinyinText pinyin={word.reading} colored={toneColors} className="text-xl font-medium" />
                ) : (
                  <span className="font-ipa text-lg text-ink-soft">
                    {extra.uk_ipa && extra.uk_ipa !== extra.us_ipa ? (
                      <>
                        <abbr title="Anh-Mỹ" className="no-underline">US</abbr> {extra.us_ipa ?? word.reading} ·{" "}
                        <abbr title="Anh-Anh" className="no-underline">UK</abbr> {extra.uk_ipa}
                      </>
                    ) : (
                      word.reading
                    )}
                  </span>
                ))}
              <PronounceButton text={word.term} lang={lang} size="lg" />
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              {word.parts_of_speech.map((p) => (
                <PosBadge key={p} pos={p} />
              ))}
              {extra.cefr && <span className="rounded-full bg-muted px-2.5 py-0.5 text-xs font-medium text-ink-soft">{extra.cefr}</span>}
              {extra.hsk?.level && (
                <span className="rounded-full bg-wash-jade px-2.5 py-0.5 text-xs font-medium text-jade-text">HSK {extra.hsk.level}</span>
              )}
              {word.topic && <span className="rounded-full bg-muted px-2.5 py-0.5 text-xs text-ink-soft">{word.topic}</span>}
            </div>
          </div>
          {word.image_url ? (
            <div className="shrink-0">
              <div className="relative size-24 overflow-hidden rounded-card border border-rule sm:size-32">
                <Image src={word.image_url} alt="" fill sizes="128px" className="object-cover" />
              </div>
            </div>
          ) : word.emoji ? (
            <span className="grid size-20 shrink-0 place-items-center rounded-card bg-wash-blue text-5xl" aria-hidden>
              {word.emoji}
            </span>
          ) : null}
        </div>
        <ImageCredit source={imageSourceOf(word)} className="mt-2 text-right" />

        <p className="mt-5 text-xl text-ink">{word.meaning_vi}</p>
        {word.meaning_en && <p className="mt-1 text-ink-soft">{word.meaning_en}</p>}
        {isZh && extra.han_viet && (
          <p className="mt-2 text-sm text-ink-soft">
            Hán Việt: <span className="font-medium text-ink">{extra.han_viet}</span>
          </p>
        )}
        {isZh && extra.measure_words && extra.measure_words.length > 0 && (
          <p className="mt-1 text-sm text-ink-soft">
            Lượng từ:{" "}
            {extra.measure_words.map((m, i) => (
              <span key={m.char} className="text-ink">
                {i > 0 && ", "}
                <span className="font-hanzi-sans">{m.char}</span> <PinyinText pinyin={m.pinyin} colored={toneColors} />
              </span>
            ))}
          </p>
        )}
        {extra.needs_review && (
          <p className="mt-3 rounded-btn bg-wash-yellow px-3 py-2 text-sm text-ink">Pinyin có chữ đa âm — nên kiểm tra lại.</p>
        )}

        <div className="mt-5 flex flex-wrap gap-2">
          {view.canEdit && (
            <Link href={`/words/${wordId}/edit`} className="inline-flex min-h-11 items-center gap-1.5 rounded-btn border border-rule bg-surface px-4 text-sm font-medium hover:bg-muted">
              <Pencil className="size-4" aria-hidden />
              Sửa
            </Link>
          )}
          {isZh && (
            <Link href={`/practice/writing?word=${wordId}`} className="inline-flex min-h-11 items-center gap-1.5 rounded-btn border border-rule bg-surface px-4 text-sm font-medium hover:bg-muted">
              <PenLine className="size-4" aria-hidden />
              Luyện viết
            </Link>
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
              <button
                type="submit"
                className="inline-flex min-h-11 items-center gap-1.5 rounded-btn bg-wash-grape px-4 text-sm font-semibold text-grape-text hover:brightness-95"
              >
                <MessageCircleHeart className="size-4" aria-hidden />
                Hỏi gia sư
              </button>
            </form>
          )}
        </div>
      </div>

      <div className="mt-2">
        {examples.length > 0 && (
          <Section title="Câu ví dụ">
            <ul className="space-y-4">
              {examples.map((e, i) => (
                <li key={i} className="flex gap-2">
                  <div className="min-w-0 flex-1">
                    <p lang={isZh ? "zh-CN" : "en"} className={isZh ? "font-hanzi-sans text-lg text-ink" : "text-ink"}>
                      {e.text}
                    </p>
                    {isZh && e.reading && <PinyinText pinyin={e.reading} colored={toneColors} className="block text-sm" />}
                    {e.vi && <p className="text-sm text-ink-soft">{e.vi}</p>}
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
                      <p className="font-hanzi text-2xl text-ink" lang="zh-CN">
                        {c}
                      </p>
                      {info?.pinyin && <PinyinText pinyin={info.pinyin} colored={toneColors} className="text-base font-medium" />}
                      {info?.meaning_vi && <p className="text-ink">{info.meaning_vi}</p>}
                      {info?.radical && (
                        <p className="text-ink-soft">
                          Bộ thủ: <span className="font-hanzi-sans text-ink">{info.radical}</span>
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
            <ul className="ruled-list">
              {collocations.map((c, i) => (
                <li key={i} className="flex items-center gap-2 py-2.5">
                  <div className="min-w-0 flex-1">
                    <p className={isZh ? "font-hanzi-sans text-ink" : "font-medium text-ink"}>
                      {c.text}
                      {isZh && c.reading && <PinyinText pinyin={c.reading} colored={toneColors} className="ml-2 text-sm font-normal" />}
                    </p>
                    {c.vi && <p className="text-sm text-ink-soft">{c.vi}</p>}
                  </div>
                  <PronounceButton text={c.text} lang={lang} size="sm" label={`Đọc cụm từ ${c.text}`} />
                </li>
              ))}
            </ul>
          </Section>
        )}

        {(word.synonyms.length > 0 || word.antonyms.length > 0) && (
          <Section title="Đồng nghĩa · Trái nghĩa">
            {word.synonyms.length > 0 && (
              <div className="flex flex-wrap items-center gap-2">
                <span className="w-20 text-sm text-ink-soft">Đồng nghĩa</span>
                {word.synonyms.map((s) => (
                  <RelatedChip key={s} text={s} />
                ))}
              </div>
            )}
            {word.antonyms.length > 0 && (
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <span className="w-20 text-sm text-ink-soft">Trái nghĩa</span>
                {word.antonyms.map((s) => (
                  <RelatedChip key={s} text={s} />
                ))}
              </div>
            )}
          </Section>
        )}

        {(family.length > 0 || extra.verb_forms || extra.plural) && (
          <Section title="Họ từ · Dạng từ">
            {family.length > 0 && (
              <ul className="ruled-list">
                {family.map((f, i) => (
                  <li key={i} className="flex flex-wrap items-baseline gap-x-2 py-2">
                    <span className="font-medium text-ink">{f.text}</span>
                    {f.pos && isPosCode(f.pos) && <span className="text-xs text-ink-soft">{POS[f.pos].label}</span>}
                    <span className="text-sm text-ink-soft">{f.vi}</span>
                  </li>
                ))}
              </ul>
            )}
            {extra.verb_forms && (
              <p className="mt-3 text-sm text-ink-soft">
                Động từ: <span className="text-ink">{extra.verb_forms.past}</span> · <span className="text-ink">{extra.verb_forms.past_participle}</span> ·{" "}
                <span className="text-ink">{extra.verb_forms.ing}</span> · <span className="text-ink">{extra.verb_forms.third_person}</span>
              </p>
            )}
            {extra.plural && (
              <p className="mt-1 text-sm text-ink-soft">
                Số nhiều: <span className="text-ink">{extra.plural}</span>
              </p>
            )}
          </Section>
        )}

        {word.personal_note && (
          <Section title="Ghi chú riêng">
            <p className="rounded-btn bg-wash-yellow px-4 py-3 whitespace-pre-line text-ink">{word.personal_note}</p>
          </Section>
        )}

        <Section title="Tiến độ của bạn">
          {recognize ? (
            <div className="space-y-1.5 text-sm">
              <StatusDot state={recognize.state} lapses={recognize.lapses} suspended={recognize.suspended} withLabel />
              <p className="text-ink-soft">
                Lần ôn gần nhất: <span className="text-ink">{recognize.last_review ? formatShortDate(recognize.last_review) : "chưa ôn"}</span>
              </p>
              {recognize.state !== "new" && (
                <p className="text-ink-soft">
                  Lần tới: <span className="text-ink">{formatRelativeDue(recognize.due)}</span>
                </p>
              )}
              <p className="text-ink-soft">
                Đã ôn {recognize.reps} lần · quên {recognize.lapses} lần
              </p>
            </div>
          ) : (
            <p className="text-sm text-ink-soft">Bạn chưa học từ này.</p>
          )}
          <SuspendToggle wordId={wordId} deckId={word.deck_id} suspended={Boolean(recognize?.suspended)} />
        </Section>
      </div>
    </article>
  );
}
