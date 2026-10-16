"use client";

import { Check, Copy, QrCode, RefreshCw, Share2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { QRCodeSVG } from "qrcode.react";
import { useState, useSyncExternalStore, useTransition } from "react";
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
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { regenerateInviteCode } from "@/lib/actions/groups";

const noop = () => () => {};

const BTN =
  "inline-flex min-h-11 items-center justify-center gap-2 rounded-[10px] border border-rule bg-surface px-3.5 text-sm font-medium text-ink hover:bg-muted";

export function InvitePanel({
  groupId,
  groupName,
  code,
  siteUrl,
  isOwner,
}: {
  groupId: string;
  groupName: string;
  code: string;
  siteUrl: string;
  isOwner: boolean;
}) {
  const router = useRouter();
  const [current, setCurrent] = useState(code);
  const [copied, setCopied] = useState(false);
  const [pending, start] = useTransition();
  const url = `${siteUrl.replace(/\/$/, "")}/join/${current}`;
  const canShare = useSyncExternalStore(noop, () => "share" in navigator, () => false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      toast.success("Đã sao chép link mời");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Không sao chép được, hãy chọn và copy link bên dưới.");
    }
  }

  async function share() {
    try {
      await navigator.share({ url, title: `Vào nhóm ${groupName} trên Sổ Từ` });
    } catch {
      // user cancelled the share sheet
    }
  }

  function regenerate() {
    start(async () => {
      const res = await regenerateInviteCode(groupId);
      if (!res.ok) return void toast.error(res.error);
      setCurrent(res.data.code);
      toast.success("Đã tạo mã mời mới");
      router.refresh();
    });
  }

  return (
    <section aria-labelledby="invite-title" className="rounded-[12px] border border-rule bg-surface p-4">
      <h2 id="invite-title" className="text-sm font-medium text-ink-soft">
        Mời bạn bè
      </h2>
      <p className="mt-1 font-mono text-2xl font-semibold tracking-[0.2em] text-ink" aria-label={`Mã mời ${current.split("").join(" ")}`}>
        {current}
      </p>
      <input
        readOnly
        value={url}
        aria-label="Link mời"
        onFocus={(e) => e.currentTarget.select()}
        className="mt-2 h-10 w-full min-w-0 rounded-[10px] border border-rule bg-muted px-3 text-sm text-ink-soft"
      />
      <div className="mt-3 flex flex-wrap gap-2">
        <button type="button" onClick={copy} className={BTN}>
          {copied ? <Check className="size-4" aria-hidden /> : <Copy className="size-4 text-ink-soft" aria-hidden />}
          Sao chép link
        </button>
        {canShare && (
          <button type="button" onClick={share} className={BTN}>
            <Share2 className="size-4 text-ink-soft" aria-hidden />
            Gửi
          </button>
        )}
        <Dialog>
          <DialogTrigger className={BTN}>
            <QrCode className="size-4 text-ink-soft" aria-hidden />
            Mã QR
          </DialogTrigger>
          <DialogContent className="rounded-[20px] sm:max-w-sm">
            <DialogHeader>
              <DialogTitle>Quét để vào nhóm</DialogTitle>
              <DialogDescription>{groupName}</DialogDescription>
            </DialogHeader>
            <div className="qr-paper mx-auto rounded-[12px] p-4">
              <QRCodeSVG
                value={url}
                size={232}
                fgColor="currentColor"
                bgColor="transparent"
                level="M"
                role="img"
                aria-label={`Mã QR của link ${url}`}
              />
            </div>
            <p className="text-center font-mono text-lg tracking-[0.2em] text-ink">{current}</p>
          </DialogContent>
        </Dialog>
        {isOwner && (
          <AlertDialog>
            <AlertDialogTrigger className={BTN} disabled={pending}>
              <RefreshCw className="size-4 text-ink-soft" aria-hidden />
              Đổi mã
            </AlertDialogTrigger>
            <AlertDialogContent className="rounded-[20px]">
              <AlertDialogHeader>
                <AlertDialogTitle>Tạo mã mời mới?</AlertDialogTitle>
                <AlertDialogDescription>
                  Mã và link cũ sẽ không dùng được nữa. Thành viên đang có trong nhóm không bị ảnh hưởng.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel className="min-h-11 rounded-[10px]">Giữ mã cũ</AlertDialogCancel>
                <AlertDialogAction className="min-h-11 rounded-[10px]" onClick={regenerate}>
                  Tạo mã mới
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        )}
      </div>
    </section>
  );
}
