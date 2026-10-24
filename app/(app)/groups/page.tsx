import type { Metadata } from "next";
import Link from "next/link";
import { ChevronRight, Plus } from "lucide-react";
import { GroupAvatar } from "@/components/group/group-avatar";
import { JoinCodeForm } from "@/components/group/join-code-form";
import { EndPup } from "@/components/mascot/end-pup";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { getMyGroups } from "@/lib/data/groups";

export const metadata: Metadata = { title: "Nhóm" };

export default async function GroupsPage() {
  const groups = await getMyGroups();

  return (
    <div>
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-xl">Nhóm</h1>
        <Button asChild>
          <Link href="/groups/new">
            <Plus aria-hidden />
            Tạo nhóm
          </Link>
        </Button>
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
                className="group flex items-center gap-4 rounded-lg border border-border bg-surface p-4 transition-colors duration-[var(--dur-fast)] hover:border-border-strong"
              >
                <GroupAvatar id={g.id} name={g.name} />
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-semibold text-fg">{g.name}</span>
                  <span className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-fg-muted">
                    <span>{g.member_count} thành viên</span>
                    <span>{g.deck_count} bộ từ</span>
                    {g.role === "owner" && <Badge variant="outline">Chủ nhóm</Badge>}
                  </span>
                </span>
                <ChevronRight className="size-4 shrink-0 text-fg-subtle" aria-hidden />
              </Link>
            </li>
          ))}
        </ul>
      ) : (
        <EmptyState
          className="mt-8"
          figure={<EndPup mood="think" figure="people" size={96} />}
          title="Học một mình hơi vắng."
          actions={
            <Button asChild size="lg">
              <Link href="/groups/new">Tạo nhóm đầu tiên</Link>
            </Button>
          }
        >
          Lập nhóm để cùng bạn bè học chung bộ từ, mỗi người giữ tiến độ riêng và so điểm trên bảng xếp hạng tuần.
        </EmptyState>
      )}
    </div>
  );
}
