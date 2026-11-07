"use client";

import { Info, SquarePen } from "lucide-react";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { ChatComposer } from "@/components/chat/chat-composer";
import { useFollowScroll } from "@/components/chat/use-follow-scroll";
import { Button } from "@/components/ui/button";
import { CLONE_STARTERS, greetingName, warmClone } from "@/lib/ai/clone/client";
import { CloneAvatar, CloneMessages } from "./clone-messages";
import { useCloneChat } from "./use-clone-chat";

/** Height of the window: the screen minus the top bar (and the phone's bottom nav), like the tutor's chat. */
const FRAME =
  "flex h-[calc(100dvh-11.5rem)] min-h-[26rem] max-w-3xl flex-col overflow-hidden rounded-xl border border-border/60 bg-surface-2 shadow-md dark:border-border lg:h-[calc(100dvh-6.5rem)] lg:min-h-[32rem]";

/**
 * "<name> (bản AI)": a chat with a companion made from what the owner wrote about themselves. It always says it
 * is an AI. The browser keeps the conversation only while this page is open (see use-clone-chat.ts); the server stores
 * it and admins can read it (see app/api/clone/route.ts), which the notice below says.
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
  const { messages, status, busy, waiting, error, locked, send, retry, stop, reset } = useCloneChat(userId);
  const [input, setInput] = useState("");
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const scroller = useRef<HTMLDivElement>(null);
  const endRef = useFollowScroll(messages, { container: scroller, force: status === "submitted" });
  const title = `${cloneName} (bản AI)`;
  const name = greetingName(displayName);

  // Ready to type as soon as the page opens (keyboard devices only: a phone keyboard would cover the window).
  useEffect(() => {
    if (window.matchMedia("(pointer: fine)").matches) inputRef.current?.focus({ preventScroll: true });
  }, []);

  const handleSend = (text: string) => {
    if (send(text)) setInput("");
    inputRef.current?.focus();
  };
  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    handleSend(input);
  };
  // "Cuộc trò chuyện mới": gone at once, no confirmation (the draft in the box too).
  const startOver = () => {
    reset();
    setInput("");
    inputRef.current?.focus();
  };
  const empty = messages.length === 0;

  return (
    <section className={FRAME} aria-label={`Khung chat với ${title}`}>
      <header className="flex shrink-0 items-center gap-3 bg-primary px-4 py-3 text-on-primary lg:px-5">
        <CloneAvatar name={cloneName} className="size-11 bg-surface text-lg ring-2 ring-white/30" />
        <div className="min-w-0 flex-1">
          <h1 data-check-overflow className="truncate text-base leading-tight font-extrabold lg:text-lg">
            {title}
          </h1>
          {/* Wraps instead of truncating: "không phải … thật" must never be cut off. */}
          <p className="text-[0.8125rem] leading-snug opacity-90 sm:text-sm" aria-live="polite">
            {busy ? "Đang nhắn…" : `Bản AI do ${cloneName} tạo từ những gì ${cloneName} tự kể · không phải ${cloneName} thật`}
          </p>
        </div>
        {messages.length > 0 && (
          <Button type="button" variant="white" size="sm" aria-label="Cuộc trò chuyện mới" onClick={startOver} className="shrink-0">
            <SquarePen aria-hidden />
            <span className="hidden sm:inline">Cuộc trò chuyện mới</span>
          </Button>
        )}
      </header>

      <div ref={scroller} className="flex-1 overflow-y-auto overscroll-contain px-4 py-5 lg:px-6">
        {/* Always the first thing of a conversation (at the start and after "Cuộc trò chuyện mới"): no close button,
            nothing remembered. It sits in the message area, so it scrolls away with the messages. */}
        <section aria-labelledby="clone-intro" className="mb-5 rounded-lg border border-border/60 bg-surface p-4 shadow-xs dark:border-border">
          <h2 id="clone-intro" data-check-overflow className="flex items-start gap-2 text-sm font-bold text-fg">
            <Info className="size-5 shrink-0 text-primary-fg" strokeWidth={2} aria-hidden />
            <span className="text-balance">Về cuộc trò chuyện này</span>
          </h2>
          <p data-check-overflow className="mt-2 text-sm text-pretty text-fg">
            Vì cuộc trò chuyện có thể liên quan đến nhiều vấn đề cá nhân, nên khi bạn thoát ứng dụng, chuyển trang hoặc bắt đầu cuộc trò chuyện mới, nội dung cũ sẽ tự động được xóa nhằm đảm bảo quyền riêng tư cho bạn.
          </p>
          <p data-check-overflow className="mt-1.5 text-xs leading-relaxed text-pretty text-fg-muted">
            Đây là bản AI của {cloneName}, có thể nhầm. Tin nhắn được gửi tới dịch vụ AI ({providerLabel}) để trả lời.
          </p>
        </section>

        {empty ? (
          <div className="space-y-4">
            <div className="flex items-start gap-2.5">
              <CloneAvatar name={cloneName} className="mt-1 size-8 text-sm" />
              <div
                data-check-overflow
                className="max-w-[85%] rounded-2xl rounded-tl-md bg-surface px-4 py-2.5 text-fg shadow-sm dark:border dark:border-border"
              >
                Hello{name ? ` ${name}` : ""} nha, tui là bản AI của {cloneName} á. Muốn tâm sự hay hỏi gì cứ nhắn tui nha
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
          <CloneMessages messages={messages} busy={busy} waiting={waiting} error={error} locked={locked} onRetry={retry} name={cloneName} tutorName={tutorName} />
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
            disabled={locked}
            size="panel"
            label={`Tin nhắn cho ${title}`}
            placeholder={locked ? "Chưa mở cho bạn" : "Nhắn gì đó…"}
          />
        </form>
      </div>
    </section>
  );
}
