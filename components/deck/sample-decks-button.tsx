"use client";

import { BookPlus, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { addSampleDecks } from "@/lib/actions/sample";

/** "Thêm bộ từ mẫu": copies ready-made decks into the account so there is something to study right away. */
export function SampleDecksButton({
  className,
  variant = "outline",
  size,
}: {
  className?: string;
  variant?: "default" | "outline";
  size?: "default" | "lg";
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  return (
    <Button
      type="button"
      variant={variant}
      size={size}
      disabled={pending}
      className={className}
      onClick={() =>
        startTransition(async () => {
          const res = await addSampleDecks();
          if (!res.ok) {
            toast.error(res.error);
            return;
          }
          toast.success(`Đã thêm ${res.data.decks} bộ từ mẫu (${res.data.words} từ).`);
          router.refresh();
        })
      }
    >
      {pending ? <Loader2 className="animate-spin" aria-hidden /> : <BookPlus aria-hidden />}
      Thêm bộ từ mẫu
    </Button>
  );
}
