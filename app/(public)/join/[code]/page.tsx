import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Users } from "lucide-react";
import { JoinButton } from "@/components/group/join-button";
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
      <div className="notebook-card mt-6 px-6 py-8">
        <h1 className="text-lg font-bold text-ink">Mã mời không dùng được</h1>
        <p className="mt-1 text-[0.9375rem] text-ink-soft">
          Mã “{code}” không đúng hoặc chủ nhóm đã đổi mã mới. Hãy hỏi lại người mời bạn.
        </p>
        <Link
          href="/groups"
          className="mt-5 inline-flex min-h-11 items-center rounded-[10px] border border-rule bg-surface px-4 text-sm font-medium text-ink"
        >
          Nhập mã khác
        </Link>
      </div>
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
    <div className="notebook-card mt-6 px-6 py-8 sm:px-8">
      <p className="flex items-center gap-2 text-sm text-ink-soft">
        <Users className="size-4" aria-hidden />
        {group.owner_name} mời bạn vào nhóm
      </p>
      <h1 className="mt-2 text-xl font-bold break-words text-ink">{group.name}</h1>
      {group.description && <p className="mt-2 text-[0.9375rem] text-ink">{group.description}</p>}
      <p className="mt-2 text-sm text-ink-soft">{group.member_count} thành viên</p>

      <ul className="mt-5 space-y-1.5 text-[0.9375rem] text-ink-soft">
        <li>· Học chung các bộ từ của nhóm, mỗi người một tiến độ riêng.</li>
        <li>· Thi đua XP trên bảng xếp hạng tuần.</li>
        <li>· Bộ từ riêng tư của bạn vẫn chỉ mình bạn thấy.</li>
      </ul>

      <div className="mt-6">
        {me ? (
          <JoinButton code={code} />
        ) : (
          <Link
            href={`/login?next=${encodeURIComponent(path)}`}
            className="inline-flex min-h-12 w-full items-center justify-center rounded-[10px] bg-primary px-6 text-base font-medium text-primary-foreground sm:w-auto"
          >
            Đăng nhập để vào nhóm
          </Link>
        )}
      </div>
    </div>
  );
}
