"use client";

import { Check, Copy } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { SwitchRow } from "@/components/settings/study-prefs";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { setShareLink } from "@/lib/actions/decks";

/** Share dialog; the page opens it from the "⋯" menu, so it is controlled from outside. */
export function ShareDeckDialog({
  deckId,
  slug,
  siteUrl,
  open,
  onOpenChange,
}: {
  deckId: string;
  slug: string | null;
  siteUrl: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
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
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
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
            <Input
              readOnly
              value={url}
              aria-label="Link chia sẻ"
              className="min-w-0 flex-1 bg-surface-2"
              onFocus={(e) => e.currentTarget.select()}
            />
            <Button type="button" onClick={copy}>
              {copied ? <Check aria-hidden /> : <Copy aria-hidden />}
              Sao chép
            </Button>
          </div>
        )}
        {current && (
          <Button type="button" variant="link" className="self-start px-0 text-fg-muted" onClick={() => toggle(true)} disabled={pending}>
            Tạo link mới (link cũ sẽ không dùng được)
          </Button>
        )}
      </DialogContent>
    </Dialog>
  );
}
