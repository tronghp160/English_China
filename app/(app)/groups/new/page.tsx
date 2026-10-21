import type { Metadata } from "next";
import { BackLink } from "@/components/app-shell/back-link";
import { GroupForm } from "@/components/group/group-form";

export const metadata: Metadata = { title: "Tạo nhóm" };

export default function NewGroupPage() {
  return (
    <div className="mx-auto max-w-xl">
      <BackLink href="/groups" label="Nhóm" />
      <h1 className="text-xl text-ink">Tạo nhóm</h1>
      <p className="mt-1 mb-6 text-sm text-ink-soft">
        Sau khi tạo, bạn nhận được mã mời 8 ký tự, link và mã QR để gửi cho bạn bè.
      </p>
      <GroupForm />
    </div>
  );
}
