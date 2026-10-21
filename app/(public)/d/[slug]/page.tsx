import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ShareActions } from "@/components/deck/share-actions";
import { LangFlag } from "@/components/lang-flag";
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

  return (
    <div className="pt-2">
      <header className="flex items-start gap-3">
        <LangFlag lang={deck.language} label className="mt-2 text-2xl" />
        <div className="min-w-0 flex-1">
          <h1 className="text-xl break-words text-ink">{deck.name}</h1>
          <p className="text-sm text-ink-soft">
            {deck.word_count} từ · của {deck.owner?.display_name}
            {deck.learner_count > 0 && ` · ${deck.learner_count} người đang học`}
          </p>
          {deck.description && <p className="mt-2 text-[0.9375rem] text-ink">{deck.description}</p>}
        </div>
      </header>

      <div className="mt-5">
        {!me ? (
          <div>
            <Link
              href={`/login?next=${encodeURIComponent(path)}`}
              className="inline-flex min-h-12 w-full items-center justify-center rounded-btn bg-primary px-6 text-base font-medium text-primary-foreground sm:w-auto"
            >
              Đăng nhập để học bộ này
            </Link>
            <p className="mt-2 text-sm text-ink-soft">Miễn phí. Lần đầu đăng nhập sẽ tự tạo tài khoản.</p>
          </div>
        ) : subscribed ? (
          <div className="flex flex-col gap-3">
            <Link
              href={`/decks/${deck.id}`}
              className="inline-flex min-h-12 w-full items-center justify-center rounded-btn bg-primary px-6 text-base font-medium text-primary-foreground sm:w-auto"
            >
              Bạn đang học bộ này · Mở bộ từ
            </Link>
            <ShareActions deckRef={{ slug }} showSubscribe={false} />
          </div>
        ) : (
          <>
            <ShareActions deckRef={{ slug }} />
            <p className="mt-2 text-sm text-ink-soft">
              “Học bộ này” tự cập nhật khi {deck.owner?.display_name} thêm từ. “Sao chép” tạo bản riêng, bạn sửa thoải
              mái.
            </p>
          </>
        )}
      </div>

      <section aria-labelledby="words-title" className="mt-8">
        <h2 id="words-title" className="mb-2 text-sm font-medium text-ink-soft">
          Danh sách từ
        </h2>
        {words.length ? (
          <ul className="ruled-list overflow-hidden rounded-card border border-rule bg-surface">
            {words.map((w) => (
              <li key={w.id} className="flex items-baseline gap-3 px-4 py-3">
                {w.emoji && (
                  <span className="shrink-0 text-lg" aria-hidden>
                    {w.emoji}
                  </span>
                )}
                <span className="min-w-0 flex-1">
                  <span className="flex flex-wrap items-baseline gap-x-2">
                    <span className={cn("text-lg font-medium text-ink", def.termFontClass)} lang={def.ttsLang}>
                      {w.term}
                    </span>
                    {w.reading && <span className="font-ipa text-sm text-ink-soft">{w.reading}</span>}
                  </span>
                  <span className="block text-[0.9375rem] text-ink">{w.meaning_vi}</span>
                </span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-ink-soft">Bộ từ này chưa có từ nào.</p>
        )}
        {deck.word_count > SHARE_PREVIEW_LIMIT && (
          <p className="mt-2 text-sm text-ink-soft">
            Đang hiện {SHARE_PREVIEW_LIMIT} từ đầu tiên. Học hoặc sao chép để xem đủ {deck.word_count} từ.
          </p>
        )}
      </section>
    </div>
  );
}
