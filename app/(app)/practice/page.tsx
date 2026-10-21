import type { Metadata } from "next";
import Link from "next/link";
import { ChevronRight } from "lucide-react";
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
    <div className="mx-auto max-w-2xl">
      <h1 className="text-xl text-ink">Luyện tập</h1>
      <p className="mt-1 mb-6 text-ink-soft">
        Luyện thêm ngoài giờ ôn. Mặc định không làm thay đổi lịch ôn.
      </p>
      <Link
        href="/hard-words"
        className="mb-6 flex min-h-16 items-center gap-3 rounded-card border border-rule bg-wash-red px-4 py-3 transition-transform hover:-translate-y-0.5"
      >
        <span aria-hidden className="text-3xl">
          🧠
        </span>
        <span className="min-w-0 flex-1">
          <span className="block font-bold text-ink">Từ hay quên</span>
          <span className="block text-sm text-ink-soft">Xem và luyện riêng những từ bạn hay quên khi ôn</span>
        </span>
        <ChevronRight className="size-5 shrink-0 text-ink-soft" aria-hidden />
      </Link>
      <PracticeSetup decks={options} studyLangs={langs} initialDeck={deck} />
    </div>
  );
}
