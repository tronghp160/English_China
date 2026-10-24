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
import { deleteDeck } from "@/lib/actions/decks";

export function DeleteDeckButton({ deckId, name }: { deckId: string; name: string }) {
  const router = useRouter();
  const [confirm, setConfirm] = useState("");
  const [pending, start] = useTransition();
  return (
    <AlertDialog onOpenChange={() => setConfirm("")}>
      <AlertDialogTrigger asChild>
        <Button variant="destructive">Xóa bộ từ</Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Xóa bộ “{name}”?</AlertDialogTitle>
          <AlertDialogDescription>Gõ tên bộ từ để xác nhận.</AlertDialogDescription>
        </AlertDialogHeader>
        <Input value={confirm} onChange={(e) => setConfirm(e.target.value)} aria-label="Tên bộ từ" />
        <AlertDialogFooter>
          <AlertDialogCancel>Giữ lại</AlertDialogCancel>
          <AlertDialogAction
            disabled={confirm.trim() !== name.trim() || pending}
            className="bg-seal text-on-seal hover:bg-seal/90"
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
