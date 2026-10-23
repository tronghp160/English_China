import type { Metadata } from "next";
import Link from "next/link";
import { GraduationCap, Layers, ListChecks, MessageCircleHeart } from "lucide-react";
import { BackLink } from "@/components/app-shell/back-link";
import { LangFlag } from "@/components/lang-flag";
import { PinyinText } from "@/components/zh/pinyin-text";
import { startChat } from "@/lib/actions/chat";
import { requireMe } from "@/lib/auth";
import { getMyDecks } from "@/lib/data/decks";
import { aiProvider } from "@/lib/env";
import { LANGUAGES } from "@/lib/lang/registry";
import type { LangCode } from "@/lib/lang/types";
import { createClient } from "@/lib/supabase/server";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Từ hay quên" };

type HardWord = { id: string; term: string; reading: string | null; meaning_vi: string };

export default async function HardWordsPage({ searchParams }: PageProps<"/hard-words">) {
  const [me, decks, sp] = await Promise.all([requireMe(), getMyDecks(), searchParams]);
  const langs = [...new Set([...me.settings.study_langs, ...decks.map((d) => d.language)])];
  const language: LangCode = langs.includes(sp.lang as LangCode) ? (sp.lang as LangCode) : (langs[0] ?? "en");

  const supabase = await createClient();
  // 'hard' = forgotten at least once or high FSRS difficulty, most-forgotten first.
  const { data } = await supabase.rpc("practice_words", {
    p_deck_id: null as unknown as string, // every deck the user studies
    p_language: language,
    p_source: "hard",
    p_limit: 100,
  });
  const words = (data ?? []).map((r) => ({ ...(r.word as unknown as HardWord), lapses: r.lapses }));
  const l = LANGUAGES[language];
  const practice = (mode: string) => `/practice/${mode}?${new URLSearchParams({ lang: language, source: "hard", n: mode === "flashcard" ? "20" : "10" })}`;

  return (
    <div className="mx-auto max-w-2xl">
      <BackLink href="/practice" label="Luyện tập" />
      <h1 className="text-xl text-ink">Từ hay quên</h1>
      <p className="mt-1 mb-5 text-ink-soft">Những từ bạn đã quên khi ôn hoặc thấy khó nhớ. Luyện riêng vài phút mỗi ngày là nhớ lâu hơn hẳn.</p>

      {langs.length > 1 && (
        <nav aria-label="Ngôn ngữ" className="mb-5 flex gap-2">
          {langs.map((code) => (
            <Link
              key={code}
              href={`/hard-words?lang=${code}`}
              aria-current={code === language ? "page" : undefined}
              className={cn(
                "inline-flex min-h-11 items-center gap-2 rounded-btn border px-3 text-sm font-semibold",
                code === language ? "border-primary bg-wash-blue text-ink" : "border-rule bg-surface text-ink-soft",
              )}
            >
              <LangFlag lang={code} />
              {LANGUAGES[code].label}
            </Link>
          ))}
        </nav>
      )}

      {words.length ? (
        <>
          <div className="mb-5 flex flex-wrap gap-2">
            <Link
              href={practice("learn")}
              className="btn-3d inline-flex min-h-12 items-center gap-2 rounded-btn bg-primary px-4 font-bold text-primary-foreground [--edge-color:var(--ink-blue-shade)]"
            >
              <GraduationCap className="size-5" aria-hidden />
              Học các từ này
            </Link>
            <Link
              href={practice("quiz")}
              className="inline-flex min-h-12 items-center gap-2 rounded-btn border border-rule bg-surface px-4 font-semibold text-ink hover:bg-muted"
            >
              <ListChecks className="size-5" aria-hidden />
              Luyện trắc nghiệm
            </Link>
            <Link
              href={practice("flashcard")}
              className="inline-flex min-h-12 items-center gap-2 rounded-btn border border-rule bg-surface px-4 font-semibold text-ink hover:bg-muted"
            >
              <Layers className="size-5" aria-hidden />
              Lật thẻ
            </Link>
            {aiProvider() !== null && (
              <form action={startChat}>
                <input type="hidden" name="language" value={language} />
                <input
                  type="hidden"
                  name="prompt"
                  value="Luyện giúp mình các từ mình hay quên: dùng chúng trong một đoạn hội thoại ngắn, rồi hỏi lại mình từng từ."
                />
                <button
                  type="submit"
                  className="inline-flex min-h-12 items-center gap-2 rounded-btn bg-wash-grape px-4 font-semibold text-grape-text hover:brightness-95"
                >
                  <MessageCircleHeart className="size-5" aria-hidden />
                  Nhờ gia sư luyện
                </button>
              </form>
            )}
          </div>

          <p className="mb-2 text-sm text-ink-soft">{words.length} từ</p>
          <ul className="divide-y divide-rule overflow-hidden rounded-card border border-rule bg-surface shadow-card">
            {words.map((w) => (
              <li key={w.id}>
                <Link href={`/words/${w.id}`} className="flex min-h-16 items-center gap-3 px-4 py-3 hover:bg-muted">
                  <span className="min-w-0 flex-1">
                    <span lang={language} className={cn("block truncate text-lg font-bold text-ink", l.termFontClass)}>
                      {w.term}
                    </span>
                    {w.reading &&
                      (language === "zh" ? (
                        <PinyinText pinyin={w.reading} className="block text-sm" />
                      ) : (
                        <span className="block truncate font-ipa text-sm text-ink-soft">{w.reading}</span>
                      ))}
                    <span className="block truncate text-sm text-ink">{w.meaning_vi}</span>
                  </span>
                  <span
                    className={cn(
                      "shrink-0 rounded-full px-2.5 py-1 text-xs font-bold",
                      w.lapses >= 3 ? "bg-wash-red text-danger" : "bg-wash-yellow text-sun-text",
                    )}
                  >
                    {w.lapses > 0 ? `quên ${w.lapses} lần` : "khó nhớ"}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </>
      ) : (
        <div className="notebook-card flex flex-col items-center px-6 py-10 text-center">
          <span aria-hidden className="animate-float text-6xl">
            🧠
          </span>
          <p className="mt-4 font-heading text-xl font-black text-ink">Chưa có từ nào hay quên</p>
          <p className="mt-1 text-sm text-ink-soft">
            Từ nào bạn quên khi ôn sẽ hiện ở đây để luyện riêng. Cứ ôn đều mỗi ngày nhé!
          </p>
          <Link
            href="/review"
            className="btn-3d mt-6 inline-flex min-h-12 items-center rounded-btn bg-primary px-5 font-bold text-primary-foreground [--edge-color:var(--ink-blue-shade)]"
          >
            Ôn tập ngay
          </Link>
        </div>
      )}
    </div>
  );
}
