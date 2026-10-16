import type { Metadata } from "next";
import Link from "next/link";
import { ChevronRight, Plus } from "lucide-react";
import { JoinCodeForm } from "@/components/group/join-code-form";
import { getMyGroups } from "@/lib/data/groups";

export const metadata: Metadata = { title: "Nhóm" };

export default async function GroupsPage() {
  const groups = await getMyGroups();

  return (
    <div>
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-xl font-bold text-ink">Nhóm</h1>
        <Link
          href="/groups/new"
          className="inline-flex min-h-11 items-center gap-1.5 rounded-[10px] border border-rule bg-surface px-4 text-sm font-medium text-ink hover:bg-muted"
        >
          <Plus className="size-4" aria-hidden />
          Tạo nhóm
        </Link>
      </div>

      <div className="mt-5 max-w-md">
        <JoinCodeForm />
      </div>

      {groups.length ? (
        <ul className="ruled-list mt-8 overflow-hidden rounded-[12px] border border-rule bg-surface">
          {groups.map((g) => (
            <li key={g.id}>
              <Link
                href={`/groups/${g.id}`}
                className="flex min-h-[4.5rem] items-center gap-3 px-4 py-3 transition-colors hover:bg-muted/60"
              >
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-medium text-ink">{g.name}</span>
                  <span className="block truncate text-sm text-ink-soft">
                    {g.member_count} thành viên · {g.deck_count} bộ từ
                    {g.role === "owner" && " · bạn là chủ nhóm"}
                  </span>
                </span>
                <ChevronRight className="size-5 shrink-0 text-ink-soft" aria-hidden />
              </Link>
            </li>
          ))}
        </ul>
      ) : (
        <div className="notebook-card mt-8 px-6 py-8">
          <p className="font-medium text-ink">Bạn chưa ở nhóm nào.</p>
          <p className="mt-1 text-sm text-ink-soft">
            Lập nhóm để cùng bạn bè học chung bộ từ, mỗi người giữ tiến độ riêng và thi đua trên bảng xếp hạng tuần.
          </p>
          <Link
            href="/groups/new"
            className="mt-4 inline-flex min-h-11 items-center rounded-[10px] bg-primary px-5 font-medium text-primary-foreground"
          >
            Tạo nhóm đầu tiên
          </Link>
        </div>
      )}
    </div>
  );
}
