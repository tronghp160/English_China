"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";
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
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { deleteGroup, removeMember } from "@/lib/actions/groups";

const CONFIRM_BTN = "bg-danger text-white hover:bg-danger/90";

export function LeaveGroupButton({ groupId, userId, name }: { groupId: string; userId: string; name: string }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button variant="destructive">Rời nhóm</Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Rời nhóm “{name}”?</AlertDialogTitle>
          <AlertDialogDescription>
            Bạn sẽ không học được bộ từ của nhóm nữa (tiến độ ôn vẫn được giữ nếu bạn vào lại). Bộ từ bạn đưa vào
            nhóm sẽ trở về riêng tư.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Ở lại</AlertDialogCancel>
          <AlertDialogAction
            disabled={pending}
            className={CONFIRM_BTN}
            onClick={() =>
              start(async () => {
                const res = await removeMember(groupId, userId);
                if (!res.ok) return void toast.error(res.error);
                toast.success("Đã rời nhóm");
                router.replace("/groups");
                router.refresh();
              })
            }
          >
            Rời nhóm
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

export function DeleteGroupButton({ groupId, name }: { groupId: string; name: string }) {
  const router = useRouter();
  const [confirm, setConfirm] = useState("");
  const [pending, start] = useTransition();
  return (
    <AlertDialog onOpenChange={() => setConfirm("")}>
      <AlertDialogTrigger asChild>
        <Button variant="destructive">Xóa nhóm</Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Xóa nhóm “{name}”?</AlertDialogTitle>
          <AlertDialogDescription>
            Mọi thành viên rời nhóm. Bộ từ của nhóm không bị xóa mà trở về riêng tư của người tạo. Gõ tên nhóm để xác
            nhận.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <Input value={confirm} onChange={(e) => setConfirm(e.target.value)} aria-label="Tên nhóm" />
        <AlertDialogFooter>
          <AlertDialogCancel>Giữ lại</AlertDialogCancel>
          <AlertDialogAction
            disabled={confirm.trim() !== name.trim() || pending}
            className={CONFIRM_BTN}
            onClick={() =>
              start(async () => {
                const res = await deleteGroup(groupId);
                if (!res.ok) return void toast.error(res.error);
                toast.success("Đã xóa nhóm");
                router.replace("/groups");
                router.refresh();
              })
            }
          >
            Xóa nhóm
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
