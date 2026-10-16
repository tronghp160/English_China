import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { BackLink } from "@/components/app-shell/back-link";
import { GroupForm } from "@/components/group/group-form";
import { DeleteGroupButton } from "@/components/group/leave-delete-buttons";
import { MemberEditToggles } from "@/components/group/member-edit-toggles";
import { getGroup } from "@/lib/data/groups";

export const metadata: Metadata = { title: "Cài đặt nhóm" };

export default async function GroupSettingsPage({ params }: PageProps<"/groups/[groupId]/settings">) {
  const { groupId } = await params;
  const view = await getGroup(groupId);
  if (!view) notFound();
  if (!view.isOwner) redirect(`/groups/${groupId}`);
  const { group, decks, userId } = view;
  const ownDecks = decks.filter((d) => d.owner_id === userId);

  return (
    <div className="max-w-xl">
      <BackLink href={`/groups/${groupId}`} label={group.name} />
      <h1 className="mb-6 text-xl font-bold text-ink">Cài đặt nhóm</h1>
      <GroupForm groupId={groupId} initial={{ name: group.name, description: group.description }} />

      <section className="mt-10 border-t border-rule pt-6">
        <h2 className="font-bold text-ink">Thành viên được sửa bộ từ</h2>
        <p className="mt-1 text-sm text-ink-soft">
          Bật để cả nhóm cùng thêm từ vào bộ của bạn. Bộ từ do thành viên khác tạo thì người đó tự quyết.
        </p>
        {ownDecks.length ? (
          <div className="mt-3">
            <MemberEditToggles decks={ownDecks} />
          </div>
        ) : (
          <p className="mt-3 text-sm text-ink-soft">Bạn chưa có bộ từ nào trong nhóm.</p>
        )}
      </section>

      <section className="mt-10 border-t border-rule pt-6">
        <h2 className="font-bold text-ink">Xóa nhóm</h2>
        <p className="mt-1 mb-4 text-sm text-ink-soft">
          Không hoàn tác được. Bộ từ và tiến độ ôn của mọi người vẫn còn.
        </p>
        <DeleteGroupButton groupId={groupId} name={group.name} />
      </section>
    </div>
  );
}
