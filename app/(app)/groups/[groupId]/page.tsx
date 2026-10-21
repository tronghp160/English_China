import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronRight, Plus, Settings } from "lucide-react";
import { BackLink } from "@/components/app-shell/back-link";
import { ActivityFeed } from "@/components/group/activity-feed";
import { InvitePanel } from "@/components/group/invite-panel";
import { Leaderboard } from "@/components/group/leaderboard";
import { LeaveGroupButton } from "@/components/group/leave-delete-buttons";
import { MemberList } from "@/components/group/member-list";
import { LangFlag } from "@/components/lang-flag";
import { getGroup } from "@/lib/data/groups";
import { publicEnv } from "@/lib/env";

export async function generateMetadata({ params }: PageProps<"/groups/[groupId]">): Promise<Metadata> {
  const view = await getGroup((await params).groupId);
  return { title: view?.group.name ?? "Nhóm" };
}

export default async function GroupPage({ params }: PageProps<"/groups/[groupId]">) {
  const { groupId } = await params;
  const view = await getGroup(groupId);
  if (!view) notFound();
  const { group, isOwner, userId, members, decks, leaderboard, activity } = view;

  return (
    <div>
      <BackLink href="/groups" label="Nhóm" />
      <header className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-xl break-words text-ink">{group.name}</h1>
          <p className="text-sm text-ink-soft">
            {members.length} thành viên · {decks.length} bộ từ
          </p>
          {group.description && <p className="mt-2 text-[0.9375rem] text-ink">{group.description}</p>}
        </div>
        {isOwner && (
          <Link
            href={`/groups/${groupId}/settings`}
            className="grid size-11 shrink-0 place-items-center rounded-btn border border-rule bg-surface text-ink-soft hover:bg-muted"
            aria-label="Cài đặt nhóm"
          >
            <Settings className="size-5" aria-hidden />
          </Link>
        )}
      </header>

      <div className="mt-5 grid gap-5 lg:grid-cols-[minmax(0,1fr)_20rem] lg:items-start">
        <div className="flex min-w-0 flex-col gap-5">
          <section aria-labelledby="decks-title">
            <div className="mb-2 flex items-center justify-between gap-2">
              <h2 id="decks-title" className="text-ink">
                Bộ từ của nhóm
              </h2>
              <Link
                href={`/decks/new?group=${groupId}`}
                className="inline-flex min-h-11 items-center gap-1.5 rounded-btn px-2 text-sm font-medium text-ink-blue"
              >
                <Plus className="size-4" aria-hidden />
                Thêm bộ từ
              </Link>
            </div>
            {decks.length ? (
              <ul className="ruled-list overflow-hidden rounded-card border border-rule bg-surface">
                {decks.map((d) => {
                  return (
                    <li key={d.id}>
                      <Link
                        href={`/decks/${d.id}`}
                        className="flex min-h-16 items-center gap-3 px-4 py-3 transition-colors hover:bg-muted/60"
                      >
                        <LangFlag lang={d.language} label className="text-lg" />
                        <span className="min-w-0 flex-1">
                          <span className="block truncate font-medium text-ink">{d.name}</span>
                          <span className="block truncate text-sm text-ink-soft">
                            {d.word_count} từ · {d.owner_id === userId ? "của bạn" : d.owner?.display_name}
                            {d.allow_member_edit && " · ai cũng thêm từ được"}
                          </span>
                        </span>
                        <ChevronRight className="size-5 shrink-0 text-ink-soft" aria-hidden />
                      </Link>
                    </li>
                  );
                })}
              </ul>
            ) : (
              <div className="notebook-card px-6 py-6">
                <p className="font-medium text-ink">Nhóm chưa có bộ từ nào.</p>
                <p className="mt-1 text-sm text-ink-soft">
                  Tạo bộ từ mới cho nhóm, hoặc vào cài đặt một bộ từ của bạn và chọn “Nhóm”. Mọi thành viên sẽ học
                  được ngay, mỗi người một tiến độ riêng.
                </p>
              </div>
            )}
          </section>

          <Leaderboard rows={leaderboard} userId={userId} />
          <ActivityFeed items={activity} />
        </div>

        <div className="flex min-w-0 flex-col gap-5">
          <InvitePanel
            groupId={groupId}
            groupName={group.name}
            code={group.invite_code}
            siteUrl={publicEnv().NEXT_PUBLIC_SITE_URL}
            isOwner={isOwner}
          />
          <section aria-labelledby="members-title">
            <h2 id="members-title" className="mb-2 text-ink">
              Thành viên
            </h2>
            <MemberList groupId={groupId} members={members} canRemove={isOwner} />
          </section>
          {!isOwner && (
            <div>
              <LeaveGroupButton groupId={groupId} userId={userId} name={group.name} />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
