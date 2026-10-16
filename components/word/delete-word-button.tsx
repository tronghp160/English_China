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
import { deleteWord } from "@/lib/actions/words";

export function DeleteWordButton({ wordId, term }: { wordId: string; term: string }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  return (
    <AlertDialog>
      <AlertDialogTrigger className="inline-flex min-h-11 items-center gap-1.5 rounded-[10px] px-3 text-sm font-medium text-danger hover:bg-wash-red">
        <Trash2 className="size-4" aria-hidden />
        Xóa từ
      </AlertDialogTrigger>
      <AlertDialogContent className="rounded-[20px]">
        <AlertDialogHeader>
          <AlertDialogTitle>Xóa “{term}”?</AlertDialogTitle>
          <AlertDialogDescription>Lịch sử ôn của từ này cũng bị xóa. Không hoàn tác được.</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel className="min-h-11 rounded-[10px]">Giữ lại</AlertDialogCancel>
          <AlertDialogAction
            disabled={pending}
            className="min-h-11 rounded-[10px] bg-danger text-white hover:bg-danger/90"
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
