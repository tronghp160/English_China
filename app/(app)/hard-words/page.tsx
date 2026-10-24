import type { Metadata } from "next";
import Link from "next/link";
import { GraduationCap, Layers, MessageCircleHeart } from "lucide-react";
import { BackLink } from "@/components/app-shell/back-link";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { SegmentedNav } from "@/components/ui/segmented";
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
    <div className="max-w-2xl">
      <BackLink href="/practice" label="Luyện tập" />
      <h1 className="text-xl">Từ hay quên</h1>
      <p className="mt-1 mb-5 max-w-[62ch] text-ink-soft">Những từ bạn đã quên khi ôn hoặc thấy khó nhớ. Luyện riêng vài phút mỗi ngày là nhớ lâu hơn hẳn.</p>

      {langs.length > 1 && (
        <SegmentedNav
          label="Ngôn ngữ"
          className="mb-5"
          items={langs.map((code) => ({ label: LANGUAGES[code].label, href: `/hard-words?lang=${code}`, active: code === language }))}
        />
      )}

      {words.length ? (
        <>
          <div className="mb-6 flex flex-wrap gap-2">
            <Button asChild>
              <Link href={practice("learn")}>
                <GraduationCap aria-hidden />
                Luyện các từ này
              </Link>
            </Button>
            <Button asChild variant="outline">
              <Link href={practice("flashcard")}>
                <Layers aria-hidden />
                Lật thẻ
              </Link>
            </Button>
            {aiProvider() !== null && (
              <form action={startChat}>
                <input type="hidden" name="language" value={language} />
                <input
                  type="hidden"
                  name="prompt"
                  value="Luyện giúp mình các từ mình hay quên: dùng chúng trong một đoạn hội thoại ngắn, rồi hỏi lại mình từng từ."
                />
                <Button type="submit" variant="secondary">
                  <MessageCircleHeart aria-hidden />
                  Hỏi gia sư
                </Button>
              </form>
            )}
          </div>

          <p className="mb-2 text-sm text-ink-soft">{words.length} từ</p>
          <ul className="ruled-list border-y border-rule">
            {words.map((w) => (
              <li key={w.id}>
                <Link href={`/words/${w.id}`} className="flex min-h-16 items-center gap-3 px-1 py-3 transition-colors hover:bg-surface-sunk">
                  <span className="min-w-0 flex-1">
                    <span className="flex flex-wrap items-baseline gap-x-3">
                      <span lang={language} className={cn("truncate text-lg font-medium text-ink", l.termFontClass === "font-hanzi" ? "font-hanzi" : "font-display")}>
                        {w.term}
                      </span>
                      {w.reading &&
                        (language === "zh" ? (
                          <PinyinText pinyin={w.reading} className="text-sm" />
                        ) : (
                          <span className="truncate font-ipa text-sm text-ink-soft">{w.reading}</span>
                        ))}
                    </span>
                    <span className="block truncate text-sm text-ink-soft">{w.meaning_vi}</span>
                  </span>
                  <span className={cn("shrink-0 text-sm font-medium tabular-nums", w.lapses >= 3 ? "text-seal-text" : "text-turmeric-text")}>
                    {w.lapses > 0 ? `quên ${w.lapses} lần` : "khó nhớ"}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </>
      ) : (
        <EmptyState
          figure="check"
          title="Chưa có từ nào hay quên."
          actions={
            <Button asChild size="lg">
              <Link href="/review">Ôn tập ngay</Link>
            </Button>
          }
        >
          Từ nào bạn quên khi ôn sẽ hiện ở đây để luyện riêng. Cứ ôn đều mỗi ngày.
        </EmptyState>
      )}
    </div>
  );
}
