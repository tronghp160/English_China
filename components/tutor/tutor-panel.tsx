"use client";

import { BotMessageSquare, Maximize2, SquarePen, X } from "lucide-react";
import Link from "next/link";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { ChatComposer } from "@/components/chat/chat-composer";
import { Pup } from "@/components/mascot/pup";
import { createTutorThread, loadTutorThread } from "@/lib/actions/chat";
import type { ChatMessage } from "@/lib/ai/chat-tools";
import type { LangCode } from "@/lib/lang/types";
import { useMediaQuery } from "@/lib/use-media-query";
import { cn } from "@/lib/utils";
import { TutorPanelChat } from "./tutor-panel-chat";
import { TutorPanelEmpty } from "./tutor-panel-empty";

export type PanelThread = {
  id: string;
  title: string | null;
  language: LangCode;
  messages: ChatMessage[];
  initialPrompt?: string;
};

export function TutorPanel({
  open,
  onClose,
  onBusy,
  onAnswerEnd,
  userId,
  displayName,
  mascot = true,
  tutorName = "Bin",
  dueCount = 0,
  studyLangs,
  aiEnabled,
}: {
  open: boolean;
  onClose: () => void;
  onBusy: (busy: boolean) => void;
  onAnswerEnd: () => void;
  userId: string;
  displayName: string;
  mascot?: boolean;
  tutorName?: string;
  dueCount?: number;
  studyLangs: LangCode[];
  aiEnabled: boolean;
}) {
  const isPhone = useMediaQuery("(max-width: 639px)");
  const panelRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const [activeThread, setActiveThread] = useState<PanelThread | null>(null);
  const [loadingThread, setLoadingThread] = useState(false);
  const [busy, setBusy] = useState(false);
  const [emptyInput, setEmptyInput] = useState("");
  const [creating, setCreating] = useState(false);

  const storageKey = `sotu:tutor-panel:${userId}`;

  // Load existing thread on mount
  useEffect(() => {
    let savedId: string | null = null;
    try {
      savedId = localStorage.getItem(storageKey);
    } catch {
      // ignore
    }
    if (!savedId) return;

    const timer = setTimeout(() => {
      setLoadingThread(true);
      void loadTutorThread(savedId)
        .then((res) => {
          if (res) {
            setActiveThread(res);
          } else {
            try {
              localStorage.removeItem(storageKey);
            } catch {
              // ignore
            }
          }
        })
        .catch(() => {
          // ignore load errors
        })
        .finally(() => {
          setLoadingThread(false);
        });
    }, 0);

    return () => clearTimeout(timer);
  }, [storageKey]);

  // Lock body scroll on phones when open
  useEffect(() => {
    if (open && isPhone) {
      document.documentElement.classList.add("overflow-hidden");
      return () => {
        document.documentElement.classList.remove("overflow-hidden");
      };
    }
  }, [open, isPhone]);

  // Focus input when opened on desktop with pointer
  useEffect(() => {
    if (open && !isPhone && window.matchMedia("(pointer: fine)").matches) {
      const timer = setTimeout(() => {
        inputRef.current?.focus();
      }, 50);
      return () => clearTimeout(timer);
    }
  }, [open, isPhone, activeThread]);

  const handleBusyChange = (isBusy: boolean) => {
    setBusy(isBusy);
    onBusy(isBusy);
  };

  const handleStartPrompt = async (promptText: string) => {
    const text = promptText.trim();
    if (!text || creating || busy) return;
    setCreating(true);
    try {
      const res = await createTutorThread(text);
      if (res.ok && res.data) {
        const id = res.data.id;
        try {
          localStorage.setItem(storageKey, id);
        } catch {
          // ignore
        }
        setActiveThread({
          id,
          title: null,
          language: studyLangs[0] ?? "en",
          messages: [],
          initialPrompt: text,
        });
        setEmptyInput("");
      }
    } finally {
      setCreating(false);
    }
  };

  const handleNewChat = () => {
    try {
      localStorage.removeItem(storageKey);
    } catch {
      // ignore
    }
    setActiveThread(null);
    setEmptyInput("");
    setBusy(false);
    onBusy(false);
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Escape" && !e.nativeEvent.isComposing) {
      e.preventDefault();
      onClose();
      return;
    }

    if (isPhone && e.key === "Tab") {
      const focusable = panelRef.current?.querySelectorAll<HTMLElement>(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
      );
      if (!focusable || focusable.length === 0) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    }
  };

  const onEmptySubmit = (e: FormEvent) => {
    e.preventDefault();
    void handleStartPrompt(emptyInput);
  };

  return (
    <div
      id="tutor-panel"
      ref={panelRef}
      role="dialog"
      aria-modal={isPhone}
      aria-label={`Trò chuyện với ${tutorName}`}
      tabIndex={-1}
      onKeyDown={onKeyDown}
      className={cn(
        "z-50 flex flex-col bg-surface shadow-lg transition-all duration-200 ease-out dark:border dark:border-border",
        // Responsive size & positioning
        isPhone
          ? "fixed inset-0 h-dvh rounded-none"
          : "fixed right-4 w-[min(400px,calc(100vw-2rem))] h-[min(600px,calc(100dvh-12rem))] bottom-[calc(6rem+60px+12px+env(safe-area-inset-bottom))] lg:right-6 lg:bottom-[calc(1.5rem+60px+12px)] lg:w-[400px] lg:h-[min(640px,calc(100dvh-8rem))] rounded-xl overflow-hidden",
        // Open/closed visibility
        open
          ? "pointer-events-auto opacity-100 scale-100"
          : "pointer-events-none opacity-0 scale-[0.96] [visibility:hidden]",
      )}
      {...(!open ? { inert: true } : {})}
    >
      {/* Header (64px) */}
      <div className="flex h-16 shrink-0 items-center justify-between gap-3 bg-primary px-4 text-on-primary">
        <div className="flex items-center gap-3 min-w-0">
          <span className="grid size-11 shrink-0 place-items-center overflow-hidden rounded-full bg-surface ring-2 ring-white/30">
            {mascot ? (
              <Pup mood={busy ? "think" : "happy"} size={40} className="translate-y-[4px]" />
            ) : (
              <BotMessageSquare className="size-6 text-primary" strokeWidth={2} aria-hidden />
            )}
          </span>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5">
              <span className="truncate font-extrabold">{mascot ? tutorName : "Gia sư AI"}</span>
              <span className="rounded-full bg-white/20 px-2 py-0.5 text-xs font-semibold text-on-primary">
                Gia sư AI
              </span>
            </div>
            <p className="truncate text-xs opacity-90" aria-live="polite">
              {busy ? "Đang trả lời…" : "Sẵn sàng giúp bạn"}
            </p>
          </div>
        </div>

        {/* Header Actions */}
        <div className="flex items-center gap-1">
          {activeThread && (
            <>
              <button
                type="button"
                onClick={handleNewChat}
                aria-label="Cuộc trò chuyện mới"
                className="grid size-10 place-items-center rounded-full text-on-primary hover:bg-white/15 active:bg-white/20 focus-visible:outline-2 focus-visible:outline-white"
              >
                <SquarePen className="size-5" aria-hidden />
              </button>
              <Link
                href={`/chat/${activeThread.id}`}
                onClick={onClose}
                aria-label="Mở toàn màn hình"
                className="grid size-10 place-items-center rounded-full text-on-primary hover:bg-white/15 active:bg-white/20 focus-visible:outline-2 focus-visible:outline-white"
              >
                <Maximize2 className="size-5" aria-hidden />
              </Link>
            </>
          )}
          <button
            type="button"
            onClick={onClose}
            aria-label="Đóng"
            className="grid size-10 place-items-center rounded-full text-on-primary hover:bg-white/15 active:bg-white/20 focus-visible:outline-2 focus-visible:outline-white"
          >
            <X className="size-5" aria-hidden />
          </button>
        </div>
      </div>

      {/* Body */}
      {loadingThread ? (
        <div className="flex flex-1 flex-col justify-end space-y-4 p-4">
          <div className="h-10 w-2/3 self-end rounded-2xl rounded-br-md bg-surface-2 animate-pulse" />
          <div className="h-16 w-3/4 rounded-2xl rounded-tl-md bg-surface-2 animate-pulse" />
        </div>
      ) : activeThread ? (
        <TutorPanelChat
          key={activeThread.id}
          threadId={activeThread.id}
          language={activeThread.language}
          initialMessages={activeThread.messages}
          initialPrompt={activeThread.initialPrompt}
          aiEnabled={aiEnabled}
          tutorName={tutorName}
          mascot={mascot}
          onBusyChange={handleBusyChange}
          onAnswerEnd={onAnswerEnd}
        />
      ) : (
        <div className="flex flex-1 flex-col overflow-hidden">
          <TutorPanelEmpty
            onPickStarter={handleStartPrompt}
            mascot={mascot}
            tutorName={tutorName}
            displayName={displayName}
            dueCount={dueCount}
            studyLangs={studyLangs}
            onClose={onClose}
          />
          {aiEnabled && (
            <form
              onSubmit={onEmptySubmit}
              className="border-t border-border/60 bg-surface p-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))]"
            >
              <ChatComposer
                ref={inputRef}
                value={emptyInput}
                onChange={setEmptyInput}
                onSend={() => void handleStartPrompt(emptyInput)}
                busy={creating}
                size="panel"
                inputId="tutor-panel-input"
                placeholder={`Hỏi ${tutorName} bất cứ điều gì…`}
              />
              <p className="mt-1.5 text-center text-[0.8125rem] text-fg-subtle">
                Gia sư AI có thể nhầm. Kiểm tra lại từ quan trọng.
              </p>
            </form>
          )}
        </div>
      )}
    </div>
  );
}
