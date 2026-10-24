"use client";

import { Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { toast } from "sonner";
import { deleteChat } from "@/lib/actions/chat";

export function DeleteChatButton({ threadId, title, redirectTo }: { threadId: string; title: string; redirectTo?: string }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  return (
    <button
      type="button"
      disabled={pending}
      aria-label={`Xóa cuộc trò chuyện “${title}”`}
      onClick={() => {
        if (!window.confirm("Xóa cuộc trò chuyện này? Không khôi phục được.")) return;
        start(async () => {
          const res = await deleteChat(threadId);
          if (!res.ok) return void toast.error(res.error);
          toast.success("Đã xóa cuộc trò chuyện");
          if (redirectTo) router.push(redirectTo);
          else router.refresh();
        });
      }}
      className="grid size-11 shrink-0 place-items-center rounded-md text-fg-muted transition-colors hover:bg-danger-soft hover:text-danger-fg disabled:opacity-50"
    >
      <Trash2 className="size-5" strokeWidth={1.75} aria-hidden />
    </button>
  );
}
