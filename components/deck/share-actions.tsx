"use client";

import { BookmarkPlus, CopyPlus, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { cloneDeck, subscribeDeck } from "@/lib/actions/sharing";

type Ref = { slug: string } | { deckId: string };

/** "Lưu vào sổ của tôi" (subscribe, follows the owner's updates) and "Sao chép" (an own copy to edit). */
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

  return (
    <div className="flex flex-col gap-2 sm:flex-row">
      {showSubscribe && (
        <Button type="button" size="lg" disabled={busy !== null} onClick={() => run("sub")}>
          {busy === "sub" ? <Loader2 className="animate-spin" aria-hidden /> : <BookmarkPlus aria-hidden />}
          Lưu vào sổ của tôi
        </Button>
      )}
      <Button type="button" size="lg" variant="outline" disabled={busy !== null} onClick={() => run("clone")}>
        {busy === "clone" ? <Loader2 className="animate-spin" aria-hidden /> : <CopyPlus aria-hidden />}
        Sao chép về bộ của tôi
      </Button>
    </div>
  );
}
