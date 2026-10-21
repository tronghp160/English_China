"use client";

import { Loader2, Sparkles } from "lucide-react";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { addSampleDecks } from "@/lib/actions/sample";
import { cn } from "@/lib/utils";

/** "Thêm bộ từ mẫu": copies ready-made decks into the account so there is something to study right away. */
export function SampleDecksButton({
  className,
  variant = "outline",
}: {
  className?: string;
  variant?: "default" | "outline";
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  return (
    <Button
      type="button"
      variant={variant}
      disabled={pending}
      className={cn("h-12 gap-2 px-5 text-base", className)}
      onClick={() =>
        startTransition(async () => {
          const res = await addSampleDecks();
          if (!res.ok) {
            toast.error(res.error);
            return;
          }
          toast.success(
            `Đã thêm ${res.data.decks} bộ từ mẫu (${res.data.words} từ). Bắt đầu ôn thôi!`,
          );
          router.refresh();
        })
      }
    >
      {pending ? (
        <Loader2 className="size-5 animate-spin" aria-hidden />
      ) : (
        <Sparkles className="size-5" aria-hidden />
      )}
      Thêm bộ từ mẫu
    </Button>
  );
}
