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
    <div className="max-w-3xl">
      <h1 className="text-xl">Luyện tập</h1>
      <p className="mt-1 mb-8 max-w-[62ch] text-fg-muted">Luyện thêm ngoài giờ ôn. Mặc định không làm thay đổi lịch ôn.</p>
      <PracticeSetup decks={options} studyLangs={langs} initialDeck={deck} />
      <Link
        href="/hard-words"
        className="mt-10 flex min-h-14 items-center gap-3 border-y border-border py-3 transition-colors hover:bg-surface-2"
      >
        <span className="min-w-0 flex-1">
          <span className="block font-semibold text-fg">Từ hay quên</span>
          <span className="block text-sm text-fg-muted">Xem và luyện riêng những từ bạn hay quên khi ôn</span>
        </span>
        <ChevronRight className="size-5 shrink-0 text-fg-subtle" aria-hidden />
      </Link>
    </div>
  );
}
