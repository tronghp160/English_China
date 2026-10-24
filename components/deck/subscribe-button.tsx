"use client";

import { BookmarkPlus, CopyPlus, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { cloneDeck, subscribeDeck, unsubscribeDeck } from "@/lib/actions/sharing";

/** Adds a deck to "Đang theo học" (primary) or, with `subscribed`, takes it out again (quiet outline). */
export function SubscribeButton({
  deckId,
  subscribed,
  variant,
  size,
  label,
}: {
  deckId: string;
  subscribed: boolean;
  variant?: "default" | "outline" | "secondary";
  size?: "default" | "sm" | "lg";
  /** Overrides the default text */
  label?: string;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  return (
    <Button
      type="button"
      variant={variant ?? (subscribed ? "outline" : "default")}
      size={size}
      disabled={pending}
      onClick={() =>
        start(async () => {
          const res = subscribed ? await unsubscribeDeck(deckId) : await subscribeDeck({ deckId });
          if (!res.ok) return void toast.error(res.error);
          toast.success(subscribed ? "Đã bỏ theo học" : "Đã thêm vào bộ đang học");
          router.refresh();
        })
      }
    >
      {pending ? <Loader2 className="animate-spin" aria-hidden /> : !subscribed && <BookmarkPlus aria-hidden />}
      {label ?? (subscribed ? "Bỏ theo học" : "Theo học")}
    </Button>
  );
}

export function CloneDeckButton({ deckId, variant = "outline", size }: { deckId: string; variant?: "default" | "outline" | "secondary"; size?: "default" | "sm" | "lg" }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  return (
    <Button
      type="button"
      variant={variant}
      size={size}
      disabled={pending}
      onClick={() =>
        start(async () => {
          const res = await cloneDeck({ deckId });
          if (!res.ok) return void toast.error(res.error);
          toast.success("Đã sao chép về bộ từ của bạn");
          router.push(`/decks/${res.data.deckId}`);
          router.refresh();
        })
      }
    >
      {pending ? <Loader2 className="animate-spin" aria-hidden /> : <CopyPlus aria-hidden />}
      Sao chép
    </Button>
  );
}
