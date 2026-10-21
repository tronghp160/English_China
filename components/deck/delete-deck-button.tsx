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
import { Input } from "@/components/ui/input";
import { deleteDeck } from "@/lib/actions/decks";

export function DeleteDeckButton({ deckId, name }: { deckId: string; name: string }) {
  const router = useRouter();
  const [confirm, setConfirm] = useState("");
  const [pending, start] = useTransition();
  return (
    <AlertDialog onOpenChange={() => setConfirm("")}>
      <AlertDialogTrigger className="min-h-11 rounded-btn bg-wash-red px-4 text-sm font-medium text-danger">
        Xóa bộ từ
      </AlertDialogTrigger>
      <AlertDialogContent className="rounded-sheet">
        <AlertDialogHeader>
          <AlertDialogTitle>Xóa bộ “{name}”?</AlertDialogTitle>
          <AlertDialogDescription>Gõ tên bộ từ để xác nhận.</AlertDialogDescription>
        </AlertDialogHeader>
        <Input value={confirm} onChange={(e) => setConfirm(e.target.value)} aria-label="Tên bộ từ" className="h-11 rounded-btn" />
        <AlertDialogFooter>
          <AlertDialogCancel className="min-h-11 rounded-btn">Giữ lại</AlertDialogCancel>
          <AlertDialogAction
            disabled={confirm.trim() !== name.trim() || pending}
            className="min-h-11 rounded-btn bg-danger text-paper hover:bg-danger/90"
            onClick={() =>
              start(async () => {
                const res = await deleteDeck(deckId);
                if (!res.ok) return void toast.error(res.error);
                toast.success("Đã xóa bộ từ");
                router.replace("/decks");
                router.refresh();
              })
            }
          >
            Xóa vĩnh viễn
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
