import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { GroupAvatar } from "@/components/group/group-avatar";
import { JoinButton } from "@/components/group/join-button";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { getMe } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Lời mời vào nhóm", robots: { index: false } };

export default async function JoinPage({ params }: PageProps<"/join/[code]">) {
  const code = (await params).code.trim().toUpperCase();
  const path = `/join/${code}`;
  const valid = /^[A-Z0-9]{8}$/.test(code);

  const supabase = await createClient();
  const { data } = valid ? await supabase.rpc("group_preview", { p_code: code }) : { data: null };
  const group = data?.[0];

  if (!group) {
    return (
      <EmptyState
        className="mt-6"
        figure="people"
        title="Mã mời không dùng được"
        actions={
          <Button asChild variant="outline">
            <Link href="/groups">Nhập mã khác</Link>
          </Button>
        }
      >
        Mã “{code}” không đúng hoặc chủ nhóm đã đổi mã mới. Hãy hỏi lại người mời bạn.
      </EmptyState>
    );
  }

  const me = await getMe();
  if (me && !me.settings.onboarded) redirect(`/welcome?next=${encodeURIComponent(path)}`);
  if (me) {
    const { data: member } = await supabase
      .from("group_members")
      .select("group_id")
      .eq("group_id", group.id)
      .eq("user_id", me.user.id)
      .maybeSingle();
    if (member) redirect(`/groups/${group.id}`);
  }

  return (
    <div className="mx-auto mt-8 max-w-md rounded-xl border border-border/60 bg-surface p-6 shadow-md dark:border-border">
      <GroupAvatar id={group.id} name={group.name} className="size-20 rounded-lg text-4xl" />
      <p className="mt-4 text-sm text-fg-muted">{group.owner_name} mời bạn vào nhóm</p>
      <h1 className="mt-1 text-[1.625rem] break-words sm:text-[2rem]">{group.name}</h1>
      {group.description && <p className="mt-2 text-[0.9375rem] text-fg">{group.description}</p>}
      <p className="mt-2 text-sm text-fg-muted">{group.member_count} thành viên</p>

      <ul className="mt-5 list-disc space-y-1.5 pl-5 text-[0.9375rem] text-fg-muted marker:text-fg-subtle">
        <li>Học chung các bộ từ của nhóm, mỗi người một tiến độ riêng.</li>
        <li>So điểm XP trên bảng xếp hạng tuần.</li>
        <li>Bộ từ riêng tư của bạn vẫn chỉ mình bạn thấy.</li>
      </ul>

      <div className="mt-6">
        {me ? (
          <JoinButton code={code} />
        ) : (
          <Button asChild variant="pressable" size="xl" className="w-full">
            <Link href={`/login?next=${encodeURIComponent(path)}`}>Đăng nhập để vào nhóm</Link>
          </Button>
        )}
      </div>
    </div>
  );
}
