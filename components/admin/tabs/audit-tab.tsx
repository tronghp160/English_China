import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ago, dateTime } from "@/lib/admin-format";
import { AUDIT_LABELS, listAuditLog } from "@/lib/data/admin-audit";

export async function AuditTab({
  action,
  page = 1,
}: {
  action?: string;
  page?: number;
}) {
  const { items, total, totalPages } = await listAuditLog({ action, page });

  const link = (p: number) => {
    const params = new URLSearchParams({ tab: "audit", page: String(p) });
    if (action && action !== "all") params.set("action", action);
    return `/admin?${params.toString()}`;
  };

  return (
    <section aria-label="Nhật ký quản trị" className="space-y-4">
      <div className="flex flex-col gap-1">
        <h2 className="text-lg font-bold">Nhật ký thao tác quản trị</h2>
        <p className="text-sm text-fg-muted">
          Ghi lại các thao tác nhạy cảm của quản trị viên (khóa, xóa, xem dữ liệu, cấp quyền).
        </p>
      </div>

      <form action="/admin" className="flex flex-wrap items-center gap-2">
        <input type="hidden" name="tab" value="audit" />
        <div className="w-full sm:w-64">
          <label htmlFor="audit-action" className="sr-only">
            Lọc theo hành động
          </label>
          <select
            id="audit-action"
            name="action"
            defaultValue={action ?? "all"}
            className="h-10 w-full rounded-md border border-input bg-surface px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <option value="all">Tất cả hành động</option>
            {Object.entries(AUDIT_LABELS).map(([act, label]) => (
              <option key={act} value={act}>
                {label}
              </option>
            ))}
          </select>
        </div>
        <Button type="submit">Lọc</Button>
      </form>

      <p className="text-sm text-fg-muted">
        {total} bản ghi{action && action !== "all" && ` cho hành động "${AUDIT_LABELS[action] ?? action}"`}
      </p>

      {items.length === 0 ? (
        <div className="rounded-lg bg-surface p-8 text-center text-sm text-fg-muted shadow-sm dark:border dark:border-border">
          Không có bản ghi nhật ký nào.
        </div>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-border bg-surface shadow-sm">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-border bg-surface-2 text-xs text-fg-muted">
              <tr>
                <th scope="col" className="p-3">Thời gian</th>
                <th scope="col" className="p-3">Quản trị viên</th>
                <th scope="col" className="p-3">Hành động</th>
                <th scope="col" className="p-3">Đối tượng</th>
                <th scope="col" className="p-3">Chi tiết</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {items.map((log) => {
                const label = AUDIT_LABELS[log.action] ?? log.action;
                const metaEntries = Object.entries(
                  (log.meta as Record<string, unknown>) ?? {},
                );

                return (
                  <tr key={log.id} className="hover:bg-surface-2/50">
                    <td className="p-3 whitespace-nowrap">
                      <div className="font-medium">{dateTime(log.created_at, true)}</div>
                      <div className="text-xs text-fg-muted">{ago(log.created_at)}</div>
                    </td>
                    <td className="p-3 whitespace-nowrap">
                      <span className="font-mono text-xs">{log.admin_email || log.admin_id || "Hệ thống"}</span>
                    </td>
                    <td className="p-3 whitespace-nowrap">
                      <Badge variant="soft" tone="blue">
                        {label}
                      </Badge>
                    </td>
                    <td className="p-3">
                      {log.target_user_id ? (
                        <Link
                          href={`/admin/users/${log.target_user_id}`}
                          className="font-medium text-primary hover:underline"
                        >
                          {log.target_label || log.target_user_id}
                        </Link>
                      ) : (
                        <span>{log.target_label || "—"}</span>
                      )}
                    </td>
                    <td className="p-3 font-mono text-xs text-fg-muted">
                      {metaEntries.length > 0 ? (
                        <span>
                          {metaEntries
                            .map(([k, v]) => `${k}: ${typeof v === "object" ? JSON.stringify(v) : String(v)}`)
                            .join(", ")}
                        </span>
                      ) : (
                        "—"
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {totalPages > 1 && (
        <nav aria-label="Trang nhật ký" className="flex items-center justify-between gap-3 pt-2">
          {page > 1 ? (
            <Button asChild variant="outline">
              <Link href={link(page - 1)}>Trang trước</Link>
            </Button>
          ) : (
            <span />
          )}
          <span className="text-sm text-fg-muted tabular-nums">
            Trang {page}/{totalPages}
          </span>
          {page < totalPages ? (
            <Button asChild variant="outline">
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
