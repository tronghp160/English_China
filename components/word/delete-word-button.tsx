"use client";

import { Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
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
import { deleteWord } from "@/lib/actions/words";

export function DeleteWordButton({ wordId, term }: { wordId: string; term: string }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button variant="destructive" size="sm">
          <Trash2 aria-hidden />
          Xóa từ
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Xóa “{term}”?</AlertDialogTitle>
          <AlertDialogDescription>Lịch sử ôn của từ này cũng bị xóa. Không hoàn tác được.</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Giữ lại</AlertDialogCancel>
          <AlertDialogAction
            disabled={pending}
            className="bg-seal text-on-seal hover:bg-seal/90"
            onClick={() =>
              start(async () => {
                const res = await deleteWord(wordId);
                if (!res.ok) return void toast.error(res.error);
                toast.success("Đã xóa từ");
                router.replace(`/decks/${res.data.deckId}`);
                router.refresh();
              })
            }
          >
            Xóa từ
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
