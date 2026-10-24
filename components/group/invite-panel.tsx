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
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { regenerateInviteCode } from "@/lib/actions/groups";

const noop = () => () => {};

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
    <section aria-labelledby="invite-title">
      <h2 id="invite-title" className="text-lg">
        Mời bạn bè
      </h2>
      <p className="mt-2 font-display text-[1.75rem] leading-none font-semibold tracking-[0.12em] text-ink" aria-label={`Mã mời ${current.split("").join(" ")}`}>
        {current}
      </p>
      <Input readOnly value={url} aria-label="Link mời" onFocus={(e) => e.currentTarget.select()} className="mt-3 bg-surface-sunk text-sm text-ink-soft" />
      <div className="mt-3 flex flex-wrap gap-2">
        <Button type="button" variant="outline" onClick={copy}>
          {copied ? <Check aria-hidden /> : <Copy aria-hidden />}
          Sao chép link
        </Button>
        {canShare && (
          <Button type="button" variant="outline" onClick={share}>
            <Share2 aria-hidden />
            Gửi
          </Button>
        )}
        <Dialog>
          <DialogTrigger asChild>
            <Button type="button" variant="outline">
              <QrCode aria-hidden />
              Mã QR
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-sm">
            <DialogHeader>
              <DialogTitle>Quét để vào nhóm</DialogTitle>
              <DialogDescription>{groupName}</DialogDescription>
            </DialogHeader>
            <div className="qr-paper mx-auto rounded-card p-4">
              <QRCodeSVG value={url} size={232} fgColor="currentColor" bgColor="transparent" level="M" role="img" aria-label={`Mã QR của link ${url}`} />
            </div>
            <p className="text-center font-display text-lg font-semibold tracking-[0.12em] text-ink">{current}</p>
          </DialogContent>
        </Dialog>
        {isOwner && (
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button type="button" variant="outline" disabled={pending}>
                <RefreshCw aria-hidden />
                Đổi mã
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Tạo mã mời mới?</AlertDialogTitle>
                <AlertDialogDescription>
                  Mã và link cũ sẽ không dùng được nữa. Thành viên đang có trong nhóm không bị ảnh hưởng.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Giữ mã cũ</AlertDialogCancel>
                <AlertDialogAction onClick={regenerate}>Tạo mã mới</AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        )}
      </div>
    </section>
  );
}
