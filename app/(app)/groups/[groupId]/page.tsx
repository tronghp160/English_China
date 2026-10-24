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
import { DeckCover } from "@/components/deck/deck-cover";
import { GroupAvatar } from "@/components/group/group-avatar";
import { LangMark } from "@/components/lang-mark";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
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
      <header className="flex items-start gap-4">
        <GroupAvatar id={groupId} name={group.name} className="size-14 text-2xl" />
        <div className="min-w-0 flex-1">
          <h1 className="text-xl break-words sm:text-2xl">{group.name}</h1>
          <p className="mt-1 flex flex-wrap gap-x-4 text-sm text-fg-muted">
            <span>{members.length} thành viên</span>
            <span>{decks.length} bộ từ</span>
          </p>
          {group.description && <p className="mt-2 max-w-[62ch] text-[0.9375rem] text-fg">{group.description}</p>}
        </div>
        {isOwner && (
          <Button asChild variant="outline" size="icon" aria-label="Cài đặt nhóm">
            <Link href={`/groups/${groupId}/settings`}>
              <Settings aria-hidden />
            </Link>
          </Button>
        )}
      </header>

      <div className="mt-8 grid gap-8 lg:grid-cols-[minmax(0,1fr)_20rem] lg:items-start lg:gap-x-12">
        <div className="flex min-w-0 flex-col gap-8">
          <section aria-labelledby="decks-title">
            <div className="mb-2 flex items-center justify-between gap-2">
              <h2 id="decks-title" className="text-lg">
                Bộ từ của nhóm
              </h2>
              <Link
                href={`/decks/new?group=${groupId}`}
                className="inline-flex min-h-11 items-center gap-1.5 rounded-md px-2 text-sm font-medium text-primary hover:underline"
              >
                <Plus className="size-4" aria-hidden />
                Thêm bộ từ
              </Link>
            </div>
            {decks.length ? (
              <ul className="divide-y divide-border border-y border-border">
                {decks.map((d) => (
                  <li key={d.id}>
                    <Link href={`/decks/${d.id}`} className="flex min-h-16 items-center gap-3 px-1 py-3 transition-colors hover:bg-surface-2">
                      <DeckCover id={d.id} language={d.language} size="sm" />
                      <span className="min-w-0 flex-1">
                        <span className="flex items-center gap-2">
                          <span className="truncate font-medium text-fg">{d.name}</span>
                          <LangMark lang={d.language} label />
                        </span>
                        <span className="mt-0.5 flex flex-wrap gap-x-3 text-sm text-fg-muted">
                          <span>{d.word_count} từ</span>
                          <span>{d.owner_id === userId ? "của bạn" : d.owner?.display_name}</span>
                          {d.allow_member_edit && <span>ai cũng thêm từ được</span>}
                        </span>
                      </span>
                      <ChevronRight className="size-4 shrink-0 text-fg-subtle" aria-hidden />
                    </Link>
                  </li>
                ))}
              </ul>
            ) : (
              <EmptyState figure="notebook" title="Nhóm chưa có bộ từ nào." className="py-6">
                Tạo bộ từ mới cho nhóm, hoặc vào cài đặt một bộ từ của bạn và chọn “Nhóm”. Mọi thành viên sẽ học được ngay, mỗi người một tiến độ riêng.
              </EmptyState>
            )}
          </section>

          <Leaderboard rows={leaderboard} userId={userId} />
          <ActivityFeed items={activity} />
        </div>

        <div className="flex min-w-0 flex-col gap-8">
          <InvitePanel
            groupId={groupId}
            groupName={group.name}
            code={group.invite_code}
            siteUrl={publicEnv().NEXT_PUBLIC_SITE_URL}
            isOwner={isOwner}
          />
          <section aria-labelledby="members-title">
            <h2 id="members-title" className="mb-2 text-lg">
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
