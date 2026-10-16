import type { Metadata } from "next";
import { PracticeSetup } from "@/components/practice/practice-setup";
import { requireMe } from "@/lib/auth";
import { getMyDecks } from "@/lib/data/decks";

export const metadata: Metadata = { title: "Luyện tập" };

export default async function PracticePage({ searchParams }: PageProps<"/practice">) {
  const [me, decks, sp] = await Promise.all([requireMe(), getMyDecks(), searchParams]);
  const deck = typeof sp.deck === "string" ? sp.deck : undefined;
  const options = decks
    .filter((d) => d.word_count > 0)
    .map((d) => ({ id: d.id, name: d.name, language: d.language, wordCount: d.word_count }));
  const langs = [...new Set([...me.settings.study_langs, ...options.map((d) => d.language)])];

  return (
    <div className="max-w-2xl">
      <h1 className="text-xl font-bold text-ink">Luyện tập</h1>
      <p className="mt-1 mb-6 text-ink-soft">
        Luyện thêm ngoài giờ ôn. Mặc định không làm thay đổi lịch ôn.
      </p>
      <PracticeSetup decks={options} studyLangs={langs} initialDeck={deck} />
    </div>
  );
}
