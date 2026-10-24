"use client";

import { ChevronRight, MessageCircle, MessagesSquare, Sparkles, X } from "lucide-react";
import { AnimatePresence, m } from "motion/react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useId, useRef, useState } from "react";
import { Pup } from "@/components/mascot/pup";
import { CONTACT, formatPhone, zaloUrl } from "@/lib/contact";
import { cn } from "@/lib/utils";
import { FacebookIcon, ZaloIcon } from "./contact-links";

/** Pages where the bubble would sit on the page's own controls: the tutor's message box. */
const HIDDEN_ON = ["/chat"];
/** Pages with the phone FAB in the same corner: the bubble moves up above it. */
const FAB_PAGES = /^\/decks(\/[^/]+)?$/;

/**
 * The chat bubble in the bottom right corner, like the help chat of most websites. It opens a small panel with
 * Bin saying hello and the ways to reach the owner (Messenger, Zalo), plus the AI tutor for signed-in people.
 * Escape, a click outside or the X closes it; focus goes back to the bubble.
 */
export function ChatWidget({ tutor = false, aboveNav = false }: { tutor?: boolean; aboveNav?: boolean }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const panelId = useId();
  const root = useRef<HTMLDivElement>(null);
  const bubble = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      setOpen(false);
      bubble.current?.focus();
    };
    const onDown = (e: PointerEvent) => {
      if (!root.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("keydown", onKey);
    document.addEventListener("pointerdown", onDown);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("pointerdown", onDown);
    };
  }, [open]);

  if (HIDDEN_ON.some((p) => pathname === p || pathname.startsWith(`${p}/`))) return null;
  const lifted = aboveNav && FAB_PAGES.test(pathname);

  const channels = [
    {
      href: CONTACT.facebook,
      label: "Nhắn qua Messenger",
      detail: "Facebook của " + CONTACT.nickname,
      tile: "bg-c-blue-soft text-c-blue-fg",
      icon: <FacebookIcon className="size-5" />,
    },
    {
      href: zaloUrl(CONTACT.zaloPhone),
      label: "Nhắn qua Zalo",
      detail: formatPhone(CONTACT.zaloPhone),
      tile: "bg-c-teal-soft text-c-teal-fg",
      icon: <ZaloIcon className="h-5 w-7" />,
    },
  ];

  return (
    <div
      ref={root}
      className={cn(
        "fixed right-4 z-40 flex flex-col items-end gap-3 lg:right-6 lg:bottom-6",
        aboveNav
          ? lifted
            ? "bottom-[calc(10rem+env(safe-area-inset-bottom))]"
            : "bottom-[calc(6rem+env(safe-area-inset-bottom))]"
          : "bottom-[calc(1rem+env(safe-area-inset-bottom))]",
      )}
    >
      <AnimatePresence>
        {open && (
          <m.div
            id={panelId}
            role="dialog"
            aria-label="Trò chuyện với Sổ Từ"
            initial={{ opacity: 0, y: 12, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.97 }}
            transition={{ type: "spring", stiffness: 480, damping: 34 }}
            style={{ transformOrigin: "bottom right" }}
            className="w-[min(22rem,calc(100vw-2rem))] overflow-hidden rounded-xl bg-surface shadow-lg dark:border dark:border-border"
          >
            <div className="flex items-center gap-3 bg-primary px-4 py-3 text-on-primary">
              <span className="grid size-11 shrink-0 place-items-center overflow-hidden rounded-full bg-surface">
                <Pup mood="wave" size={40} />
              </span>
              <div className="min-w-0 flex-1">
                <p className="font-extrabold">Sổ Từ</p>
                <p className="text-sm opacity-90">{CONTACT.nickname} trả lời sớm nhất có thể</p>
              </div>
              <button
                type="button"
                aria-label="Đóng"
                onClick={() => {
                  setOpen(false);
                  bubble.current?.focus();
                }}
                className="grid size-10 shrink-0 place-items-center rounded-full hover:bg-white/15"
              >
                <X className="size-5" aria-hidden />
              </button>
            </div>

            <div className="flex flex-col gap-3 p-4">
              <p className="w-fit max-w-[90%] rounded-lg rounded-tl-[4px] bg-surface-2 px-3.5 py-2.5 text-[0.9375rem] leading-snug">
                Chào bạn! Có lỗi, góp ý hay câu hỏi gì về Sổ Từ, cứ nhắn cho mình nhé.
              </p>
              <ul className="flex flex-col gap-2">
                {channels.map((c) => (
                  <li key={c.label}>
                    <a
                      href={c.href}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex min-h-14 items-center gap-3 rounded-lg border border-border/60 px-3 py-2 transition-colors hover:bg-surface-2 dark:border-border"
                    >
                      <span className={cn("grid size-10 shrink-0 place-items-center rounded-md", c.tile)}>{c.icon}</span>
                      <span className="min-w-0 flex-1">
                        <span className="block font-bold">{c.label}</span>
                        <span className="block truncate text-sm text-fg-muted">{c.detail}</span>
                      </span>
                      <ChevronRight className="size-4 shrink-0 text-fg-subtle" aria-hidden />
                    </a>
                  </li>
                ))}
                {tutor && (
                  <li>
                    <Link
                      href="/chat"
                      onClick={() => setOpen(false)}
                      className="flex min-h-14 items-center gap-3 rounded-lg bg-c-grape-soft px-3 py-2 text-c-grape-fg transition-transform hover:-translate-y-0.5"
                    >
                      <span className="grid size-10 shrink-0 place-items-center rounded-md bg-c-grape text-white">
                        <Sparkles className="size-5" aria-hidden />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block font-bold">Hỏi gia sư AI</span>
                        <span className="block truncate text-sm">Hỏi về từ vựng, ngữ pháp, cách học</span>
                      </span>
                      <ChevronRight className="size-4 shrink-0" aria-hidden />
                    </Link>
                  </li>
                )}
              </ul>
              <Link
                href="/lien-he"
                onClick={() => setOpen(false)}
                className="inline-flex min-h-10 items-center gap-1.5 self-center rounded-md px-2 text-sm font-semibold text-primary-fg hover:underline"
              >
                <MessagesSquare className="size-4" aria-hidden />
                Xem trang liên hệ
              </Link>
            </div>
          </m.div>
        )}
      </AnimatePresence>

      <button
        ref={bubble}
        type="button"
        aria-label={open ? "Đóng khung trò chuyện" : "Mở khung trò chuyện"}
        aria-expanded={open}
        aria-controls={open ? panelId : undefined}
        onClick={() => setOpen((o) => !o)}
        className="grid size-14 place-items-center rounded-full bg-primary text-on-primary shadow-primary transition-[transform,background-color] hover:-translate-y-0.5 hover:bg-primary-hover active:translate-y-0"
      >
        {open ? <X className="size-6" aria-hidden /> : <MessageCircle className="size-6" strokeWidth={2.2} aria-hidden />}
      </button>
    </div>
  );
}
