"use client";

import { Check, Copy, Share2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { SwitchRow } from "@/components/settings/study-prefs";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { setShareLink } from "@/lib/actions/decks";

export function ShareDeckDialog({ deckId, slug, siteUrl }: { deckId: string; slug: string | null; siteUrl: string }) {
  const router = useRouter();
  const [current, setCurrent] = useState(slug);
  const [copied, setCopied] = useState(false);
  const [pending, start] = useTransition();
  const url = current ? `${siteUrl.replace(/\/$/, "")}/d/${current}` : null;

  function toggle(enabled: boolean) {
    start(async () => {
      const res = await setShareLink(deckId, enabled);
      if (!res.ok) return void toast.error(res.error);
      setCurrent(res.data.slug);
      router.refresh();
    });
  }

  async function copy() {
    if (!url) return;
    try {
      if (navigator.share && /Android|iPhone|iPad/.test(navigator.userAgent)) {
        await navigator.share({ url, title: "Bộ từ trên Sổ Từ" });
        return;
      }
      await navigator.clipboard.writeText(url);
      setCopied(true);
      toast.success("Đã sao chép link");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // user cancelled the share sheet
    }
  }

  return (
    <Dialog>
      <DialogTrigger className="inline-flex min-h-11 shrink-0 items-center gap-2 rounded-[10px] border border-rule bg-surface px-3.5 text-sm font-medium text-ink hover:bg-muted">
        <Share2 className="size-4 text-ink-soft" aria-hidden />
        Chia sẻ
      </DialogTrigger>
      <DialogContent className="rounded-[20px]">
        <DialogHeader>
          <DialogTitle>Chia sẻ bộ từ</DialogTitle>
          <DialogDescription>
            Người có link xem được danh sách từ, rồi có thể học trực tiếp hoặc sao chép về bộ của họ.
          </DialogDescription>
        </DialogHeader>
        <SwitchRow
          id="share-link"
          label="Chia sẻ bằng link"
          checked={Boolean(current)}
          onCheckedChange={(v) => !pending && toggle(v)}
        />
        {url && (
          <div className="flex items-center gap-2">
            <input
              readOnly
              value={url}
              aria-label="Link chia sẻ"
              className="h-11 min-w-0 flex-1 rounded-[10px] border border-rule bg-muted px-3 text-sm text-ink"
              onFocus={(e) => e.currentTarget.select()}
            />
            <Button type="button" onClick={copy} className="h-11 gap-1.5 rounded-[10px] px-4">
              {copied ? <Check className="size-4" aria-hidden /> : <Copy className="size-4" aria-hidden />}
              Sao chép
            </Button>
          </div>
        )}
        {current && (
          <button
            type="button"
            className="min-h-11 self-start text-sm text-ink-soft underline-offset-4 hover:underline"
            onClick={() => toggle(true)}
            disabled={pending}
          >
            Tạo link mới (link cũ sẽ không dùng được)
          </button>
        )}
      </DialogContent>
    </Dialog>
  );
}
