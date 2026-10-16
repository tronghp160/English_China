"use client";

import { UserMinus } from "lucide-react";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { toast } from "sonner";
import { UserAvatar } from "@/components/app-shell/user-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { removeMember } from "@/lib/actions/groups";

type Member = {
  user_id: string;
  role: "owner" | "member";
  profile: { display_name: string; username: string; avatar_url: string | null } | null;
};

export function MemberList({
  groupId,
  members,
  canRemove,
}: {
  groupId: string;
  members: Member[];
  canRemove: boolean;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();

  return (
    <ul className="ruled-list overflow-hidden rounded-[12px] border border-rule bg-surface">
      {members.map((m) => {
        const p = m.profile!;
        return (
          <li key={m.user_id} className="flex min-h-14 items-center gap-3 px-4 py-2">
            <UserAvatar name={p.display_name} url={p.avatar_url} className="size-9" />
            <span className="min-w-0 flex-1">
              <span className="block truncate font-medium text-ink">{p.display_name}</span>
              <span className="block truncate text-sm text-ink-soft">
                @{p.username}
                {m.role === "owner" && " · chủ nhóm"}
              </span>
            </span>
            {canRemove && m.role !== "owner" && (
              <AlertDialog>
                <AlertDialogTrigger
                  className="grid size-11 shrink-0 place-items-center rounded-[10px] text-ink-soft hover:bg-wash-red hover:text-danger"
                  aria-label={`Xóa ${p.display_name} khỏi nhóm`}
                  disabled={pending}
                >
                  <UserMinus className="size-5" aria-hidden />
                </AlertDialogTrigger>
                <AlertDialogContent className="rounded-[20px]">
                  <AlertDialogHeader>
                    <AlertDialogTitle>Xóa {p.display_name} khỏi nhóm?</AlertDialogTitle>
                    <AlertDialogDescription>
                      Họ không học được bộ từ của nhóm nữa. Bộ từ họ đưa vào nhóm sẽ trở về riêng tư của họ.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel className="min-h-11 rounded-[10px]">Thôi</AlertDialogCancel>
                    <AlertDialogAction
                      className="min-h-11 rounded-[10px] bg-danger text-white hover:bg-danger/90"
                      onClick={() =>
                        start(async () => {
                          const res = await removeMember(groupId, m.user_id);
                          if (!res.ok) return void toast.error(res.error);
                          toast.success(`Đã xóa ${p.display_name} khỏi nhóm`);
                          router.refresh();
                        })
                      }
                    >
                      Xóa khỏi nhóm
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            )}
          </li>
        );
      })}
    </ul>
  );
}
