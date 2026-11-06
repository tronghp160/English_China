"use client";

import { Info, SquarePen, X } from "lucide-react";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { ChatComposer } from "@/components/chat/chat-composer";
import { useFollowScroll } from "@/components/chat/use-follow-scroll";
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
import { CLONE_INTRO_KEY, CLONE_STARTERS, warmClone } from "@/lib/ai/clone/client";
import { CloneAvatar, CloneMessages } from "./clone-messages";
import { useCloneChat } from "./use-clone-chat";

/** Height of the window: the screen minus the top bar (and the phone's bottom nav), like the tutor's chat. */
const FRAME =
  "flex h-[calc(100dvh-11.5rem)] min-h-[26rem] max-w-3xl flex-col overflow-hidden rounded-xl border border-border/60 bg-surface-2 shadow-md dark:border-border lg:h-[calc(100dvh-6.5rem)] lg:min-h-[32rem]";

/**
 * "<name> (bản AI)": a chat with a companion made from what the owner wrote about themselves. It always says it
 * is an AI; the conversation stays in this browser (localStorage) and the server keeps nothing.
 */
export function CloneChat({
  userId,
  cloneName,
  displayName,
  providerLabel,
  tutorName,
}: {
  userId: string;
  cloneName: string;
  displayName: string;
  /** Who writes the answers ("Google Gemini" / "Anthropic Claude"), for the notice. */
  providerLabel: string;
  tutorName: string;
}) {
  const { messages, status, busy, waiting, error, restored, send, retry, stop, reset } = useCloneChat(userId);
  const [input, setInput] = useState("");
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const scroller = useRef<HTMLDivElement>(null);
  const endRef = useFollowScroll(messages, { container: scroller, force: status === "submitted" });
  const title = `${cloneName} (bản AI)`;

  // Ready to type as soon as the page opens (keyboard devices only: a phone keyboard would cover the window).
  useEffect(() => {
    if (window.matchMedia("(pointer: fine)").matches) inputRef.current?.focus({ preventScroll: true });
  }, []);

  // The explanation card shows until it is closed once (remembered in this browser). Decided after mounting.
  const [introOpen, setIntroOpen] = useState(false);
  useEffect(() => {
    const timer = setTimeout(() => {
      try {
        setIntroOpen(window.localStorage.getItem(CLONE_INTRO_KEY) !== "1");
      } catch {
        setIntroOpen(true);
      }
    }, 0);
    return () => clearTimeout(timer);
  }, []);
  const closeIntro = () => {
    setIntroOpen(false);
    try {
      window.localStorage.setItem(CLONE_INTRO_KEY, "1");
    } catch {
      // not remembered
    }
  };

  // A restored conversation starts at its newest message (an empty one stays at the top, on the first-visit card).
  const hasMessages = messages.length > 0;
  useEffect(() => {
    const el = scroller.current;
    if (el && restored && hasMessages) el.scrollTop = el.scrollHeight;
  }, [restored, hasMessages]);

  const handleSend = (text: string) => {
    if (send(text)) setInput("");
    inputRef.current?.focus();
  };
  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    handleSend(input);
  };
  const empty = restored && messages.length === 0;

  return (
    <section className={FRAME} aria-label={`Khung chat với ${title}`}>
      <header className="flex shrink-0 items-center gap-3 bg-primary px-4 py-3 text-on-primary lg:px-5">
        <CloneAvatar name={cloneName} className="size-11 bg-surface text-lg ring-2 ring-white/30" />
        <div className="min-w-0 flex-1">
          <h1 data-check-overflow className="truncate text-base leading-tight font-extrabold lg:text-lg">
            {title}
          </h1>
          {/* Wraps instead of truncating: "không phải … thật" must never be cut off. */}
          <p className="text-sm leading-snug opacity-90" aria-live="polite">
            {busy ? "Đang nhắn…" : (
              <>
                <span className="sm:hidden">Bản AI · không phải {cloneName} thật</span>
                <span className="hidden sm:inline">
                  Bản AI do {cloneName} tạo từ những gì {cloneName} tự kể · không phải {cloneName} thật
                </span>
              </>
            )}
          </p>
        </div>
        {messages.length > 0 && (
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button type="button" variant="white" size="sm" aria-label="Cuộc trò chuyện mới" className="shrink-0">
                <SquarePen aria-hidden />
                <span className="hidden sm:inline">Cuộc trò chuyện mới</span>
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Bắt đầu cuộc trò chuyện mới?</AlertDialogTitle>
                <AlertDialogDescription>
                  Cuộc trò chuyện hiện tại sẽ bị xóa khỏi trình duyệt này và không khôi phục được. Máy chủ không giữ bản nào.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel className="min-h-11 rounded-md">Giữ lại</AlertDialogCancel>
                <AlertDialogAction className="min-h-11 rounded-md" onClick={reset}>
                  Xóa và bắt đầu lại
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        )}
      </header>

      <div ref={scroller} className="flex-1 overflow-y-auto overscroll-contain px-4 py-5 lg:px-6">
        {introOpen && (
          <section aria-labelledby="clone-intro" className="mb-5 rounded-lg border border-border/60 bg-surface p-4 shadow-xs dark:border-border">
            <div className="flex items-start gap-3">
              <Info className="mt-0.5 size-5 shrink-0 text-primary-fg" strokeWidth={2} aria-hidden />
              <div className="min-w-0 flex-1 space-y-1.5 text-sm text-fg">
                <h2 id="clone-intro" className="font-bold">
                  Trước khi nhắn
                </h2>
                <p>
                  Đây là bản AI của {cloneName}, nói chuyện theo những gì {cloneName} tự kể về mình. Có thể sai chỗ này chỗ kia.
                </p>
                <p>
                  Cuộc trò chuyện chỉ lưu trên trình duyệt này (bấm “Cuộc trò chuyện mới” để xóa, nhất là trên máy dùng chung).{" "}
                  {cloneName} và quản trị viên không đọc được.
                </p>
                <p>Để trả lời, tin nhắn được gửi tới dịch vụ AI ({providerLabel}).</p>
              </div>
              <Button type="button" variant="ghost" size="icon" aria-label="Đóng phần giải thích" onClick={closeIntro} className="-mt-1 -mr-1 size-10 shrink-0">
                <X className="size-5" aria-hidden />
              </Button>
            </div>
          </section>
        )}

        {empty ? (
          <div className="space-y-4">
            <div className="flex items-start gap-2.5">
              <CloneAvatar name={cloneName} className="mt-1 size-8 text-sm" />
              <div
                data-check-overflow
                className="max-w-[85%] rounded-2xl rounded-tl-md bg-surface px-4 py-2.5 text-fg shadow-sm dark:border dark:border-border"
              >
                Chào {displayName}! Mình là bản AI của {cloneName}. Bạn muốn tâm sự hay hỏi gì cứ nhắn nhé.
              </div>
            </div>
            <ul className="flex flex-wrap gap-2 pl-10.5" aria-label="Gợi ý tin nhắn">
              {CLONE_STARTERS.map((s) => (
                <li key={s}>
                  <button
                    type="button"
                    onClick={() => handleSend(s)}
                    className="inline-flex min-h-10 items-center rounded-full border border-border/80 bg-surface px-3.5 text-sm font-medium text-fg shadow-xs transition-colors hover:border-primary/50 hover:bg-surface-2 focus-visible:outline-2 focus-visible:outline-primary"
                  >
                    {s}
                  </button>
                </li>
              ))}
            </ul>
          </div>
        ) : (
          <CloneMessages messages={messages} busy={busy} waiting={waiting} error={error} onRetry={retry} name={cloneName} tutorName={tutorName} />
        )}
        <div ref={endRef} />
      </div>

      <div className="shrink-0 border-t border-border/60 bg-surface px-3 pt-3 pb-[max(0.5rem,env(safe-area-inset-bottom))] dark:border-border lg:px-5">
        <form onSubmit={onSubmit}>
          <ChatComposer
            ref={inputRef}
            inputId="clone-input"
            value={input}
            onChange={setInput}
            onSend={() => handleSend(input)}
            onStop={stop}
            onWarm={warmClone}
            busy={busy}
            size="panel"
            label={`Tin nhắn cho ${title}`}
            placeholder="Nhắn gì đó…"
          />
        </form>
        <p className="mt-1.5 text-center text-[0.8125rem] text-fg-subtle">Bản AI có thể nhầm. Cuộc trò chuyện chỉ lưu trên trình duyệt này.</p>
      </div>
    </section>
  );
}
