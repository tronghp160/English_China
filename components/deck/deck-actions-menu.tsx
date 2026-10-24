"use client";

import { Download, FileUp, MoreHorizontal, PenLine, Settings, Share2, BookmarkMinus, CopyPlus } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { ShareDeckDialog } from "@/components/deck/share-deck-dialog";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cloneDeck, unsubscribeDeck } from "@/lib/actions/sharing";

/** The "⋯" menu on a deck page: everything that is not the two main actions. Share opens its dialog from here. */
export function DeckActionsMenu({
  deckId,
  slug,
  siteUrl,
  canEdit,
  isOwner,
  isSubscribed,
}: {
  deckId: string;
  slug: string | null;
  siteUrl: string;
  canEdit: boolean;
  isOwner: boolean;
  isSubscribed: boolean;
}) {
  const router = useRouter();
  const [shareOpen, setShareOpen] = useState(false);
  const [, start] = useTransition();

  function clone() {
    start(async () => {
      const res = await cloneDeck({ deckId });
      if (!res.ok) return void toast.error(res.error);
      toast.success("Đã sao chép về bộ từ của bạn");
      router.push(`/decks/${res.data.deckId}`);
      router.refresh();
    });
  }

  function unsubscribe() {
    start(async () => {
      const res = await unsubscribeDeck(deckId);
      if (!res.ok) return void toast.error(res.error);
      toast.success("Đã bỏ theo học");
      router.refresh();
    });
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="icon" aria-label="Thêm tùy chọn cho bộ từ">
            <MoreHorizontal aria-hidden />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56">
          {canEdit && (
            <DropdownMenuItem asChild>
              <Link href={`/decks/${deckId}/import`}>
                <FileUp aria-hidden /> Nhập hàng loạt
              </Link>
            </DropdownMenuItem>
          )}
          <DropdownMenuItem asChild>
            <Link href={`/practice?deck=${deckId}`}>
              <PenLine aria-hidden /> Luyện tập
            </Link>
          </DropdownMenuItem>
          {isOwner && (
            <DropdownMenuItem onSelect={() => setShareOpen(true)}>
              <Share2 aria-hidden /> Chia sẻ
            </DropdownMenuItem>
          )}
          <DropdownMenuItem asChild>
            <a href={`/api/decks/${deckId}/export`}>
              <Download aria-hidden /> Xuất CSV
            </a>
          </DropdownMenuItem>
          {!isOwner && (
            <DropdownMenuItem onSelect={clone}>
              <CopyPlus aria-hidden /> Sao chép về bộ của tôi
            </DropdownMenuItem>
          )}
          {(isOwner || isSubscribed) && <DropdownMenuSeparator />}
          {isOwner && (
            <DropdownMenuItem asChild>
              <Link href={`/decks/${deckId}/settings`}>
                <Settings aria-hidden /> Cài đặt bộ từ
              </Link>
            </DropdownMenuItem>
          )}
          {isSubscribed && (
            <DropdownMenuItem onSelect={unsubscribe}>
              <BookmarkMinus aria-hidden /> Bỏ theo học
            </DropdownMenuItem>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
      {isOwner && <ShareDeckDialog deckId={deckId} slug={slug} siteUrl={siteUrl} open={shareOpen} onOpenChange={setShareOpen} />}
    </>
  );
}
