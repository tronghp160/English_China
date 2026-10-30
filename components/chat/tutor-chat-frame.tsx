"use client";

import { BotMessageSquare, Maximize2, Minimize2, SquarePen } from "lucide-react";
import { useEffect, useRef, useState, type FormEvent, type ReactNode } from "react";
import { toast } from "sonner";
import { PettablePup } from "@/components/mascot/pettable-pup";
import { Pup } from "@/components/mascot/pup";
import { Button } from "@/components/ui/button";
import { createTutorThread } from "@/lib/actions/chat";
import { threadTitle } from "@/lib/ai/chat-prompt";
import type { ChatMessage } from "@/lib/ai/chat-tools";
import { FOLLOW_UPS, type ChatStarter } from "@/lib/ai/tutor/starters";
import type { LangCode } from "@/lib/lang/types";
import { ChatComposer } from "./chat-composer";
import { ChatMessages } from "./chat-messages";
import { ChatStarters } from "./chat-starters";
import { useFollowScroll } from "./use-follow-scroll";
import { useTutorChat } from "./use-tutor-chat";

type Common = {
  language: LangCode;
  starters: ChatStarter[];
  tutorName: string;
  mascot: boolean;
  aiEnabled: boolean;
  displayName: string;
  onNewChat: () => void;
  /** Full screen: the window covers the whole page (sidebar, top bar and phone nav included). */
  expanded: boolean;
  onToggleExpand: () => void;
};

/**
 * The tutor's chat window on /chat: a card with a blue header, the messages scrolling inside and the
 * message box pinned at the bottom. With no conversation yet it shows Bin's greeting and the starters;
 * the first question creates the conversation right here (no page change).
 */
export function TutorChatFrame(
  props: Common & {
    threadId: string | null;
    title: string | null;
    initialMessages: ChatMessage[];
    initialPrompt?: string;
    onCreated: (thread: { id: string; title: string; prompt: string }) => void;
  },
) {
  return props.threadId ? (
    <ThreadFrame {...props} threadId={props.threadId} />
  ) : (
    <EmptyFrame {...props} />
  );
}

/** Height of the window: the screen minus the top bar (and the phone's bottom nav). */
const FRAME =
  "flex h-[calc(100dvh-11.5rem)] min-h-[26rem] flex-col overflow-hidden rounded-xl border border-border/60 bg-surface shadow-md dark:border-border lg:h-[calc(100dvh-6.5rem)] lg:min-h-[32rem]";
/** Full screen: fixed over everything; the reading column stays a comfortable width. */
const FRAME_EXPANDED = "fixed inset-0 z-50 flex h-dvh flex-col overflow-hidden bg-surface";
const frameClass = (expanded: boolean) => (expanded ? FRAME_EXPANDED : FRAME);
/** Centers messages and the box in full screen so lines do not run across a wide monitor. */
const column = (expanded: boolean) => (expanded ? "mx-auto w-full max-w-3xl" : "");

function FrameHeader({
  title,
  busy,
  tutorName,
  mascot,
  onNewChat,
  showNew,
  expanded,
  onToggleExpand,
}: {
  title: string;
  busy: boolean;
  tutorName: string;
  mascot: boolean;
  onNewChat: () => void;
  showNew: boolean;
  expanded: boolean;
  onToggleExpand: () => void;
}) {
  return (
    <header className="flex shrink-0 items-center gap-3 bg-primary px-4 py-3 text-on-primary lg:px-5">
      <span className="grid size-11 shrink-0 place-items-center overflow-hidden rounded-full bg-surface ring-2 ring-white/30">
        {mascot ? (
          <Pup mood={busy ? "think" : "happy"} size={44} crop="head" />
        ) : (
          <BotMessageSquare className="size-6 text-primary-fg" strokeWidth={2} aria-hidden />
        )}
      </span>
      <div className="min-w-0 flex-1">
        <h1 className="truncate text-base leading-tight font-extrabold lg:text-lg">{title}</h1>
        <p className="truncate text-sm opacity-90" aria-live="polite">
          {tutorName} · Gia sư AI · {busy ? "Đang trả lời…" : "Sẵn sàng giúp bạn"}
        </p>
      </div>
      {showNew && (
        <Button type="button" variant="white" size="sm" onClick={onNewChat} aria-label="Cuộc trò chuyện mới" className="shrink-0">
          <SquarePen aria-hidden />
          <span className="hidden sm:inline">Cuộc trò chuyện mới</span>
        </Button>
      )}
      <button
        type="button"
        onClick={onToggleExpand}
        aria-label={expanded ? "Thu nhỏ khung chat" : "Mở toàn màn hình"}
        aria-pressed={expanded}
        title={expanded ? "Thu nhỏ (Esc)" : "Toàn màn hình"}
        className="grid size-10 shrink-0 place-items-center rounded-full text-on-primary transition-colors hover:bg-white/15 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
      >
        {expanded ? <Minimize2 className="size-5" aria-hidden /> : <Maximize2 className="size-5" aria-hidden />}
      </button>
    </header>
  );
}

function FrameFooter({ children, expanded }: { children: ReactNode; expanded: boolean }) {
  return (
    <div className="shrink-0 border-t border-border/60 bg-surface px-3 pt-3 pb-[max(0.5rem,env(safe-area-inset-bottom))] dark:border-border lg:px-5">
      <div className={column(expanded)}>{children}</div>
      <p className="mt-1.5 text-center text-[0.8125rem] text-fg-subtle">Gia sư AI có thể nhầm. Kiểm tra lại từ quan trọng.</p>
    </div>
  );
}

function EmptyFrame({
  language,
  starters,
  tutorName,
  mascot,
  aiEnabled,
  displayName,
  onNewChat,
  onCreated,
  expanded,
  onToggleExpand,
}: Common & { onCreated: (thread: { id: string; title: string; prompt: string }) => void }) {
  const [input, setInput] = useState("");
  const [pending, setPending] = useState<string | null>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Ready to type as soon as the page opens (keyboard devices only: a phone keyboard would cover the window).
  useEffect(() => {
    if (window.matchMedia("(pointer: fine)").matches) inputRef.current?.focus({ preventScroll: true });
  }, []);

  const ask = async (text: string) => {
    const t = text.trim();
    if (!t || pending) return;
    setPending(t);
    const res = await createTutorThread(t);
    if (!res.ok) {
      setPending(null);
      toast.error(res.error);
      return;
    }
    onCreated({ id: res.data.id, title: threadTitle(t), prompt: t });
  };
  const pick = (s: ChatStarter) => {
    if (s.send) return void ask(s.text);
    setInput(s.text);
    requestAnimationFrame(() => {
      const el = inputRef.current;
      el?.focus();
      el?.setSelectionRange(s.text.length, s.text.length);
    });
  };
  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    void ask(input);
  };

  // While the conversation is being created, show the question and Bin thinking.
  const pendingMessages: ChatMessage[] = pending ? [{ id: "pending", role: "user", parts: [{ type: "text", text: pending }] }] : [];

  return (
    <section className={frameClass(expanded)} aria-label="Khung chat với gia sư" aria-modal={expanded || undefined} role={expanded ? "dialog" : undefined}>
      <FrameHeader title={`Hỏi ${tutorName} bất cứ điều gì`} busy={Boolean(pending)} tutorName={tutorName} mascot={mascot} onNewChat={onNewChat} showNew={false} expanded={expanded} onToggleExpand={onToggleExpand} />
      <div className="flex-1 overflow-y-auto overscroll-contain px-4 py-5 lg:px-6">
        <div className={column(expanded)}>
        {pending ? (
          <ChatMessages messages={pendingMessages} busy waiting language={language} aiEnabled={aiEnabled} tutorName={tutorName} mascot={mascot} />
        ) : (
          <div className="mx-auto flex max-w-xl flex-col items-center gap-5 text-center">
            {mascot && <PettablePup name={tutorName} mood="wave" size={96} />}
            <div className="space-y-1.5">
              <p className="font-display text-xl text-fg lg:text-2xl">Chào {displayName}!</p>
              <p className="text-fg-muted">
                Hỏi {tutorName} về tiếng Anh hay tiếng Trung: nghĩa từ, ngữ pháp, sửa câu, luyện nói. {tutorName} biết những từ trong sổ
                của bạn.
              </p>
            </div>
            {aiEnabled ? (
              <div className="w-full text-left">
                <ChatStarters starters={starters} onPick={pick} disabled={Boolean(pending)} />
              </div>
            ) : (
              <p className="text-sm text-danger-fg">Gia sư chưa được bật (thiếu khóa AI trên máy chủ).</p>
            )}
          </div>
        )}
        </div>
      </div>
      {aiEnabled && (
        <FrameFooter expanded={expanded}>
          <form onSubmit={onSubmit}>
            <ChatComposer
              ref={inputRef}
              value={input}
              onChange={setInput}
              onSend={() => void ask(input)}
              busy={Boolean(pending)}
              size="panel"
              label="Tin nhắn cho gia sư"
              placeholder="Hỏi về một từ, nhờ sửa câu, luyện hội thoại…"
            />
          </form>
        </FrameFooter>
      )}
    </section>
  );
}

function ThreadFrame({
  threadId,
  title,
  initialMessages,
  initialPrompt,
  language,
  tutorName,
  mascot,
  aiEnabled,
  onNewChat,
  expanded,
  onToggleExpand,
}: Common & { threadId: string; title: string | null; initialMessages: ChatMessage[]; initialPrompt?: string }) {
  const { messages, status, busy, waiting, error, send, retry, stop, lastHasText } = useTutorChat({
    threadId,
    initialMessages,
    initialPrompt,
    aiEnabled,
  });
  const [input, setInput] = useState("");
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const scroller = useRef<HTMLDivElement>(null);
  const endRef = useFollowScroll(messages, { container: scroller, force: status === "submitted" });

  // An opened conversation starts at its newest message.
  useEffect(() => {
    const el = scroller.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, []);

  const handleSend = (text: string) => {
    send(text);
    setInput("");
    inputRef.current?.focus();
  };
  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    handleSend(input);
  };
  const showFollowUps = !busy && messages.at(-1)?.role === "assistant" && lastHasText;

  return (
    <section className={frameClass(expanded)} aria-label="Khung chat với gia sư" aria-modal={expanded || undefined} role={expanded ? "dialog" : undefined}>
      <FrameHeader title={title ?? "Cuộc trò chuyện mới"} busy={busy} tutorName={tutorName} mascot={mascot} onNewChat={onNewChat} showNew expanded={expanded} onToggleExpand={onToggleExpand} />
      <div ref={scroller} className="flex-1 overflow-y-auto overscroll-contain px-4 py-5 lg:px-6">
        <div className={column(expanded)}>
        <ChatMessages
          messages={messages}
          busy={busy}
          waiting={waiting}
          error={error}
          onRetry={retry}
          language={language}
          aiEnabled={aiEnabled}
          tutorName={tutorName}
          mascot={mascot}
          density="page"
        />
        {showFollowUps && (
          <div className="mt-3 flex flex-wrap gap-2 pl-10.5">
            {FOLLOW_UPS.map((fu) => (
              <button
                key={fu}
                type="button"
                onClick={() => handleSend(fu)}
                className="inline-flex min-h-10 items-center rounded-full border border-border/80 bg-surface px-3.5 text-sm font-medium text-fg shadow-xs transition-colors hover:border-primary/50 hover:bg-surface-2 focus-visible:outline-2 focus-visible:outline-primary"
              >
                {fu}
              </button>
            ))}
          </div>
        )}
        <div ref={endRef} />
        </div>
      </div>
      {aiEnabled && (
        <FrameFooter expanded={expanded}>
          <form onSubmit={onSubmit}>
            <ChatComposer
              ref={inputRef}
              value={input}
              onChange={setInput}
              onSend={() => handleSend(input)}
              onStop={stop}
              busy={busy}
              size="panel"
              label="Tin nhắn cho gia sư"
              placeholder={`Hỏi tiếp ${tutorName}…`}
            />
          </form>
        </FrameFooter>
      )}
    </section>
  );
}
