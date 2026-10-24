import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ShareActions } from "@/components/deck/share-actions";
import { DeckCover } from "@/components/deck/deck-cover";
import { Button } from "@/components/ui/button";
import { WordSpecimen } from "@/components/word/word-specimen";
import { getMe } from "@/lib/auth";
import { getSharedDeck, SHARE_PREVIEW_LIMIT } from "@/lib/data/share";
import { LANGUAGES } from "@/lib/lang/registry";
import { createClient } from "@/lib/supabase/server";
import { cn } from "@/lib/utils";

export async function generateMetadata({ params }: PageProps<"/d/[slug]">): Promise<Metadata> {
  const shared = await getSharedDeck((await params).slug);
  return {
    title: shared?.deck.name ?? "Bộ từ được chia sẻ",
    description: shared ? `${shared.deck.word_count} từ trên Sổ Từ` : undefined,
    robots: { index: false },
  };
}

export default async function SharedDeckPage({ params }: PageProps<"/d/[slug]">) {
  const { slug } = await params;
  const shared = await getSharedDeck(slug);
  if (!shared) notFound();
  const { deck, words } = shared;
  const def = LANGUAGES[deck.language];
  const path = `/d/${slug}`;

  const me = await getMe();
  if (me && !me.settings.onboarded) redirect(`/welcome?next=${encodeURIComponent(path)}`);
  let subscribed = false;
  if (me) {
    if (deck.owner_id === me.user.id) redirect(`/decks/${deck.id}`);
    const supabase = await createClient();
    const { data } = await supabase
      .from("deck_subscriptions")
      .select("deck_id")
      .eq("deck_id", deck.id)
      .eq("user_id", me.user.id)
      .maybeSingle();
    subscribed = Boolean(data);
  }

  const preview = words.slice(0, 5);
  const rest = words.slice(5);

  return (
    <div className="pt-2">
      <header className="flex items-start gap-4">
        <DeckCover id={deck.id} language={deck.language} name={deck.name} size="lg" />
        <div className="min-w-0 flex-1">
          <h1 className="text-xl break-words sm:text-2xl">{deck.name}</h1>
          <p className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-sm text-fg-muted">
            <span>{def.label}</span>
            <span>{deck.word_count} từ</span>
            <span>của {deck.owner?.display_name}</span>
            {deck.learner_count > 0 && <span>{deck.learner_count} người đang học</span>}
          </p>
          {deck.description && <p className="mt-3 text-[0.9375rem] text-fg">{deck.description}</p>}
        </div>
      </header>

      <div className="mt-6">
        {!me ? (
          <div>
            <Button asChild size="lg" className="w-full sm:w-auto">
              <Link href={`/login?next=${encodeURIComponent(path)}`}>Đăng nhập để học bộ này</Link>
            </Button>
            <p className="mt-2 text-sm text-fg-muted">Miễn phí. Chưa có tài khoản thì đăng ký chỉ mất một phút.</p>
          </div>
        ) : subscribed ? (
          <div className="flex flex-col gap-3">
            <Button asChild size="lg" className="w-full sm:w-auto">
              <Link href={`/decks/${deck.id}`}>Bạn đang học bộ này, mở bộ từ</Link>
            </Button>
            <ShareActions deckRef={{ slug }} showSubscribe={false} />
          </div>
        ) : (
          <>
            <ShareActions deckRef={{ slug }} />
            <p className="mt-2 max-w-[62ch] text-sm text-fg-muted">
              “Lưu vào sổ của tôi” tự cập nhật khi {deck.owner?.display_name} thêm từ. “Sao chép” tạo bản riêng, bạn sửa thoải mái.
            </p>
          </>
        )}
      </div>

      <section aria-labelledby="words-title" className="mt-10">
        <h2 id="words-title" className="mb-3 text-lg">
          Danh sách từ
        </h2>
        {words.length ? (
          <>
            <ul className="grid gap-4 sm:grid-cols-2">
              {preview.map((w) => (
                <li key={w.id} className="min-w-0">
                  <WordSpecimen lang={deck.language} term={w.term} reading={w.reading} size="sm" className={deck.language === "zh" ? "rounded-lg border border-border/60 bg-surface shadow-sm p-4" : undefined}>
                    <p className="flex min-h-[var(--line)] items-end pb-1 text-[0.9375rem] text-fg">{w.meaning_vi}</p>
                  </WordSpecimen>
                </li>
              ))}
            </ul>
            {rest.length > 0 && (
              <ul className="divide-y divide-border mt-4 border-y border-border">
                {rest.map((w) => (
                  <li key={w.id} className="flex items-baseline gap-3 px-1 py-3">
                    <span className="min-w-0 flex-1">
                      <span className="flex flex-wrap items-baseline gap-x-2">
                        <span className={cn("text-lg font-medium text-fg", deck.language === "zh" ? "font-hanzi" : "font-display")} lang={def.ttsLang}>
                          {w.term}
                        </span>
                        {w.reading && <span className="font-ipa text-sm text-fg-muted">{w.reading}</span>}
                      </span>
                      <span className="block text-[0.9375rem] text-fg">{w.meaning_vi}</span>
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </>
        ) : (
          <p className="text-sm text-fg-muted">Bộ từ này chưa có từ nào.</p>
        )}
        {deck.word_count > SHARE_PREVIEW_LIMIT && (
          <p className="mt-3 text-sm text-fg-muted">
            Đang hiện {SHARE_PREVIEW_LIMIT} từ đầu tiên. Lưu hoặc sao chép để xem đủ {deck.word_count} từ.
          </p>
        )}
      </section>
    </div>
  );
}
