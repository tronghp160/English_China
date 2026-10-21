import type { Metadata } from "next";
import Link from "next/link";
import { ChevronRight, Plus } from "lucide-react";
import { JoinCodeForm } from "@/components/group/join-code-form";
import { getMyGroups } from "@/lib/data/groups";
import { deckTone } from "@/lib/deck-colors";
import { cn } from "@/lib/utils";

const GROUP_EMOJI = ["🦊", "🐼", "🦄", "🐯", "🐬", "🦉", "🐝", "🐙"];

export const metadata: Metadata = { title: "Nhóm" };

export default async function GroupsPage() {
  const groups = await getMyGroups();

  return (
    <div>
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-xl text-ink">Nhóm</h1>
        <Link
          href="/groups/new"
          className="btn-3d inline-flex min-h-11 items-center gap-1.5 rounded-btn bg-primary px-4 text-sm font-bold text-primary-foreground [--edge-color:var(--ink-blue-shade)]"
        >
          <Plus className="size-4" aria-hidden />
          Tạo nhóm
        </Link>
      </div>

      <div className="mt-5 max-w-md">
        <JoinCodeForm />
      </div>

      {groups.length ? (
        <ul className="mt-8 grid gap-3 md:grid-cols-2 2xl:grid-cols-3">
          {groups.map((g) => (
            <li key={g.id} className="min-w-0">
              <Link
                href={`/groups/${g.id}`}
                className="group flex items-center gap-4 rounded-card border border-rule bg-surface p-4 shadow-card transition-transform hover:-translate-y-0.5"
              >
                <span
                  aria-hidden
                  className={cn("grid size-14 shrink-0 place-items-center rounded-2xl text-3xl transition-transform group-hover:rotate-6", deckTone(g.id).wash)}
                >
                  {GROUP_EMOJI[parseInt(g.id.slice(0, 8), 16) % GROUP_EMOJI.length]}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-bold text-ink">{g.name}</span>
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
        <div className="notebook-card mt-8 flex flex-col items-center px-6 py-10 text-center">
          <span aria-hidden className="animate-float text-6xl">
            🧑‍🤝‍🧑
          </span>
          <p className="mt-4 font-heading text-xl font-black text-ink">Học một mình hơi buồn?</p>
          <p className="mt-1 text-sm text-ink-soft">
            Lập nhóm để cùng bạn bè học chung bộ từ, mỗi người giữ tiến độ riêng và thi đua trên bảng xếp hạng tuần.
          </p>
          <Link
            href="/groups/new"
            className="btn-3d mt-6 inline-flex min-h-12 items-center rounded-btn bg-primary px-5 font-bold text-primary-foreground [--edge-color:var(--ink-blue-shade)]"
          >
            Tạo nhóm đầu tiên
          </Link>
        </div>
      )}
    </div>
  );
}
