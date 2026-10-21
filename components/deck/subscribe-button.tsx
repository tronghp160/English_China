"use client";

import { BookmarkMinus, BookmarkPlus, CopyPlus, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { toast } from "sonner";
import { cloneDeck, subscribeDeck, unsubscribeDeck } from "@/lib/actions/sharing";
import { cn } from "@/lib/utils";

export function SubscribeButton({ deckId, subscribed }: { deckId: string; subscribed: boolean }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  return (
    <button
      type="button"
      disabled={pending}
      onClick={() =>
        start(async () => {
          const res = subscribed ? await unsubscribeDeck(deckId) : await subscribeDeck({ deckId });
          if (!res.ok) return void toast.error(res.error);
          toast.success(subscribed ? "Đã bỏ theo học" : "Đã thêm vào bộ đang học");
          router.refresh();
        })
      }
      className={cn(
        "inline-flex min-h-11 shrink-0 items-center gap-2 rounded-btn px-4 text-sm font-medium",
        subscribed ? "border border-rule bg-surface text-ink hover:bg-muted" : "bg-primary text-primary-foreground",
      )}
    >
      {pending ? (
        <Loader2 className="size-4 animate-spin" aria-hidden />
      ) : subscribed ? (
        <BookmarkMinus className="size-4" aria-hidden />
      ) : (
        <BookmarkPlus className="size-4" aria-hidden />
      )}
      {subscribed ? "Bỏ theo học" : "Học bộ này"}
    </button>
  );
}

export function CloneDeckButton({ deckId }: { deckId: string }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  return (
    <button
      type="button"
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
      className="inline-flex min-h-11 shrink-0 items-center gap-2 rounded-btn border border-rule bg-surface px-3.5 text-sm font-medium text-ink hover:bg-muted"
    >
      {pending ? <Loader2 className="size-4 animate-spin" aria-hidden /> : <CopyPlus className="size-4 text-ink-soft" aria-hidden />}
      Sao chép
    </button>
  );
}
