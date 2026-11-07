import { HeartHandshake } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ago, dateTime } from "@/lib/admin-format";
import { CLONE_THREADS_PER_PAGE, listAllCloneThreads } from "@/lib/data/admin";
import { logAdminAction } from "@/lib/data/admin-audit";

/** Every "Tâm sự" conversation, newest first. A row opens in the per-user viewer, which logs the read. */
export async function TamSuTab({
  admin,
  q,
  page,
}: {
  admin: { id: string; email?: string | null };
  q: string;
  page: number;
}) {
  const { rows, total } = await listAllCloneThreads({ q, page });
  // The rows show the start of each conversation, so a page of this list is a read too.
  await logAdminAction({ admin, action: "clone_list", meta: { page, ...(q ? { q } : {}) } });

  const totalPages = Math.max(1, Math.ceil(total / CLONE_THREADS_PER_PAGE));
  const link = (p: number) => {
    const params = new URLSearchParams({ tab: "tamsu", page: String(p) });
    if (q) params.set("q", q);
    return `/admin?${params.toString()}`;
  };

  return (
    <section aria-label="Cuộc trò chuyện Tâm sự" className="space-y-4">
      <div className="flex flex-col gap-1">
        <h2 className="text-lg font-bold">Cuộc trò chuyện Tâm sự</h2>
        <p className="text-sm text-fg-muted">Mọi phiên của mọi tài khoản, mới nhất trước. Mỗi lần xem đều được ghi vào Nhật ký.</p>
      </div>

      <form action="/admin" className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <input type="hidden" name="tab" value="tamsu" />
        <label htmlFor="tamsu-q" className="sr-only">
          Tìm theo người dùng
        </label>
        <Input id="tamsu-q" name="q" defaultValue={q} placeholder="Tìm theo email, tên hoặc @username" className="flex-1" />
        <Button type="submit" variant="outline">
          Tìm
        </Button>
      </form>

      {rows.length === 0 ? (
        <div className="flex flex-col items-center gap-2 rounded-lg bg-surface p-8 text-center text-sm text-fg-muted shadow-xs dark:border dark:border-border">
          <HeartHandshake className="size-8 text-c-coral-fg" strokeWidth={2} aria-hidden />
          <p>{q ? "Không có phiên nào khớp." : "Chưa có cuộc trò chuyện tâm sự nào."}</p>
        </div>
      ) : (
        <ul aria-label="Danh sách phiên tâm sự" className="flex flex-col gap-2">
          {rows.map((t) => (
            <li key={t.id}>
              <Link
                href={`/admin/users/${t.userId}?tab=tamsu&thread=${t.id}`}
                className="block rounded-lg bg-surface p-3 shadow-xs transition-colors hover:bg-surface-2 focus-visible:outline-2 focus-visible:outline-primary dark:border dark:border-border"
              >
                <span className="flex flex-wrap items-baseline gap-x-2">
                  <span className="font-semibold text-fg">{t.displayName}</span>
                  {t.email && <span className="min-w-0 text-xs break-all text-fg-muted">{t.email}</span>}
                </span>
                <span className="mt-1 block truncate text-sm text-fg">{t.title}</span>
                <span className="mt-1 block text-xs text-fg-muted tabular-nums">
                  {t.messageCount} tin · <time dateTime={t.lastMessageAt} title={dateTime(t.lastMessageAt, true)}>{ago(t.lastMessageAt)}</time>
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}

      {totalPages > 1 && (
        <nav aria-label="Phân trang" className="flex items-center justify-between gap-3">
          {page > 1 ? (
            <Button asChild variant="outline" size="sm">
              <Link href={link(page - 1)}>Trang trước</Link>
            </Button>
          ) : (
            <span />
          )}
          <span className="text-sm text-fg-muted tabular-nums">
            Trang {page}/{totalPages}
          </span>
          {page < totalPages ? (
            <Button asChild variant="outline" size="sm">
              <Link href={link(page + 1)}>Trang sau</Link>
            </Button>
          ) : (
            <span />
          )}
        </nav>
      )}
    </section>
  );
}
