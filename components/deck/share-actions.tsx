"use client";

import { BookmarkPlus, CopyPlus, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { cloneDeck, subscribeDeck } from "@/lib/actions/sharing";
import { cn } from "@/lib/utils";

type Ref = { slug: string } | { deckId: string };

/** "Học bộ này" (subscribe, follows the owner's updates) and "Sao chép" (own copy). */
export function ShareActions({ deckRef, showSubscribe = true }: { deckRef: Ref; showSubscribe?: boolean }) {
  const router = useRouter();
  const [busy, setBusy] = useState<"sub" | "clone" | null>(null);
  const [, start] = useTransition();

  function run(kind: "sub" | "clone") {
    setBusy(kind);
    start(async () => {
      const res = kind === "sub" ? await subscribeDeck(deckRef) : await cloneDeck(deckRef);
      setBusy(null);
      if (!res.ok) return void toast.error(res.error);
      toast.success(kind === "sub" ? "Đã thêm vào bộ đang học" : "Đã sao chép về bộ từ của bạn");
      router.push(`/decks/${res.data.deckId}`);
      router.refresh();
    });
  }

  const base = "inline-flex min-h-12 items-center justify-center gap-2 rounded-[10px] px-5 text-base font-medium";
  return (
    <div className="flex flex-col gap-2 sm:flex-row">
      {showSubscribe && (
        <button
          type="button"
          disabled={busy !== null}
          onClick={() => run("sub")}
          className={cn(base, "bg-primary text-primary-foreground")}
        >
          {busy === "sub" ? <Loader2 className="size-5 animate-spin" aria-hidden /> : <BookmarkPlus className="size-5" aria-hidden />}
          Học bộ này
        </button>
      )}
      <button
        type="button"
        disabled={busy !== null}
        onClick={() => run("clone")}
        className={cn(base, "border border-rule bg-surface text-ink hover:bg-muted")}
      >
        {busy === "clone" ? <Loader2 className="size-5 animate-spin" aria-hidden /> : <CopyPlus className="size-5 text-ink-soft" aria-hidden />}
        Sao chép về bộ của tôi
      </button>
    </div>
  );
}
