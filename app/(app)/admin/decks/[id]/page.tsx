import { ArrowLeft, Calendar, Share2, UsersRound } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { AdminAction } from "@/components/admin/admin-actions";
import { AdminWordTable } from "@/components/admin/admin-word-table";
import { LangMark } from "@/components/lang-mark";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { deleteDeckAsAdmin, hidePublicDeck } from "@/lib/actions/admin";
import { requireAdmin } from "@/lib/admin";
import { getAdminDeck, listDeckWords } from "@/lib/data/admin";

export const metadata: Metadata = { title: "Bộ từ · Quản trị", robots: { index: false } };

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const dateFmt = (iso: string | null) =>
  iso
    ? new Intl.DateTimeFormat("vi-VN", {
        timeZone: "Asia/Ho_Chi_Minh",
        dateStyle: "short",
      }).format(new Date(iso))
    : "chưa";

export default async function AdminDeckPage({
  params,
  searchParams,
}: PageProps<"/admin/decks/[id]">) {
  await requireAdmin();
  const [{ id }, sp] = await Promise.all([params, searchParams]);
  if (!UUID.test(id)) notFound();

  const deck = await getAdminDeck(id);
  if (!deck) notFound();

  const q = typeof sp.q === "string" ? sp.q.slice(0, 100) : "";
  const page = Math.max(1, Number(typeof sp.page === "string" ? sp.page : 1) || 1);

  const { rows, total } = await listDeckWords(id, { q, page });

  const queryParams = new URLSearchParams();
  if (q) queryParams.set("q", q);

  const shareUrl = `/share/decks/${deck.id}`;

  return (
    <div className="flex max-w-4xl flex-col gap-6">
      <Link
        href="/admin?tab=decks"
        className="inline-flex min-h-10 w-fit items-center gap-1.5 rounded-md text-sm font-semibold text-fg-muted hover:text-fg"
      >
        <ArrowLeft className="size-4" aria-hidden />
        Bộ từ công khai
      </Link>

      <header className="flex flex-col gap-4 rounded-xl bg-surface p-5 shadow-sm dark:border dark:border-border">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <LangMark lang={deck.language} />
              <h1 className="text-[1.5rem] leading-tight font-bold">{deck.name}</h1>
              <Badge
                variant="soft"
                tone={
                  deck.visibility === "public"
                    ? "teal"
                    : deck.group
                      ? "orange"
                      : undefined
                }
              >
                {deck.visibility === "public"
                  ? "Công khai"
                  : deck.group
                    ? "Nhóm"
                    : deck.visibility === "unlisted"
                      ? "Có link"
                      : "Riêng tư"}
              </Badge>
            </div>

            {deck.description && (
              <p className="mt-2 text-sm text-fg-muted line-clamp-2">{deck.description}</p>
            )}

            <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-fg-muted">
              <span>
                Chủ sở hữu:{" "}
                <Link
                  href={`/admin/users/${deck.owner_id}`}
                  className="font-semibold text-fg hover:underline"
                >
                  {deck.owner.displayName} (@{deck.owner.username})
                </Link>
              </span>
              {deck.group && (
                <span className="inline-flex items-center gap-1">
                  <UsersRound className="size-3.5 text-orange-fg" aria-hidden />
                  Nhóm: <strong>{deck.group.name}</strong>
                </span>
              )}
              <span className="inline-flex items-center gap-1">
                <Calendar className="size-3.5" aria-hidden />
                Tạo ngày {dateFmt(deck.created_at)}
              </span>
              <span>Cập nhật {dateFmt(deck.updated_at)}</span>
              <span>{deck.word_count} từ vựng</span>
              <span>{deck.learner_count} người học</span>
            </div>

            {(deck.visibility === "public" || deck.visibility === "unlisted") && (
              <div className="mt-3 flex items-center gap-1.5 text-xs text-fg-muted">
                <Share2 className="size-3.5" aria-hidden />
                <span>Link chia sẻ: </span>
                <Link href={shareUrl} className="font-mono text-primary hover:underline">
                  {shareUrl}
                </Link>
              </div>
            )}
          </div>

          <div className="flex shrink-0 flex-wrap gap-2">
            {deck.visibility === "public" && (
              <AdminAction
                label="Chuyển về riêng tư"
                run={hidePublicDeck.bind(null, { deckId: deck.id })}
                done="Đã chuyển bộ từ về riêng tư."
                confirm={{
                  title: `Chuyển "${deck.name}" về riêng tư?`,
                  text: "Bộ từ sẽ không còn hiển thị trên trang Khám phá. Người đang học vẫn giữ tiến độ.",
                  action: "Chuyển về riêng tư",
                }}
              />
            )}
            <AdminAction
              label="Xóa bộ từ"
              destructive
              run={deleteDeckAsAdmin.bind(null, { deckId: deck.id })}
              done="Đã xóa bộ từ."
              confirm={{
                title: `Xóa hẳn bộ từ "${deck.name}"?`,
                text: "Xóa bộ từ, toàn bộ từ vựng trong bộ và tiến độ học của mọi người. Không hoàn tác được.",
                action: "Xóa bộ từ",
              }}
            />
          </div>
        </div>
      </header>

      {/* Words in Deck */}
      <section aria-label="Từ vựng trong bộ" className="flex flex-col gap-4">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <h2 className="text-lg font-bold">Danh sách từ vựng ({deck.word_count})</h2>
          <form action={`/admin/decks/${deck.id}`} className="flex gap-2">
            <label htmlFor="deck-words-q" className="sr-only">
              Tìm từ vựng trong bộ
            </label>
            <Input
              id="deck-words-q"
              name="q"
              defaultValue={q}
              placeholder="Tìm theo từ hoặc nghĩa..."
              className="w-full sm:w-64"
            />
            <Button type="submit">Tìm</Button>
          </form>
        </div>

        <AdminWordTable
          rows={rows}
          total={total}
          page={page}
          baseHref={`/admin/decks/${deck.id}?${queryParams.toString()}`}
          showStatus={false}
          showDeck={false}
          showCreator={true}
        />
      </section>

      {/* Learners list */}
      <section
        aria-label="Người đang theo học"
        className="rounded-lg bg-surface p-5 shadow-sm dark:border dark:border-border"
      >
        <h2 className="mb-3 text-lg font-bold">
          Người đang theo học ({deck.learners.length})
        </h2>
        {deck.learners.length ? (
          <ul className="divide-y divide-border">
            {deck.learners.map((learner) => (
              <li
                key={learner.userId}
                className="flex items-center justify-between py-2.5 text-sm"
              >
                <div>
                  <Link
                    href={`/admin/users/${learner.userId}`}
                    className="font-semibold text-fg hover:underline"
                  >
                    {learner.displayName}
                  </Link>
                  <span className="ml-1.5 text-xs text-fg-muted">@{learner.username}</span>
                </div>
                <span className="text-xs text-fg-subtle">
                  Theo học từ {dateFmt(learner.subscribedAt)}
                </span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-fg-muted">Chưa có ai theo học bộ từ này.</p>
        )}
      </section>
    </div>
  );
}
