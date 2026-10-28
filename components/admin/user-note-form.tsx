"use client";

import { Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { saveUserNote } from "@/lib/actions/admin";

export function UserNoteForm({
  userId,
  initialNote,
}: {
  userId: string;
  initialNote: string | null;
}) {
  const router = useRouter();
  const [note, setNote] = useState(initialNote ?? "");
  const [pending, start] = useTransition();

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        start(async () => {
          const res = await saveUserNote({ userId, note });
          if (!res.ok) {
            toast.error(res.error || "Chưa lưu được ghi chú.");
            return;
          }
          toast.success("Đã lưu ghi chú quản trị.");
          router.refresh();
        });
      }}
      className="space-y-3"
    >
      <Textarea
        value={note}
        onChange={(e) => setNote(e.target.value)}
        placeholder="Nhập ghi chú riêng của quản trị viên về người dùng này..."
        maxLength={2000}
        rows={3}
        className="resize-y"
      />
      <div className="flex items-center justify-between">
        <span className="text-xs text-fg-muted tabular-nums">
          {note.length}/2000 ký tự
        </span>
        <Button type="submit" size="sm" disabled={pending}>
          {pending && <Loader2 className="animate-spin" aria-hidden="true" />}
          Lưu ghi chú
        </Button>
      </div>
    </form>
  );
}
