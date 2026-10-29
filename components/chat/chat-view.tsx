"use client";

import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import { BookOpenCheck, RotateCcw } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { useOptionalMe } from "@/components/app-shell/me-provider";
import { Pup } from "@/components/mascot/pup";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { CHAT_MAX_CHARS } from "@/lib/ai/chat-prompt";
import type { ChatMessage } from "@/lib/ai/chat-tools";
import type { ChatStarter } from "@/lib/ai/tutor/starters";
import type { LangCode } from "@/lib/lang/types";
import { ChatComposer } from "./chat-composer";
import { ChatStarters } from "./chat-starters";
import { MessageText } from "./message-text";
import { SuggestWordCard } from "./suggest-word-card";

/** Server errors arrive as the JSON body ({ error }) or as the stream's error text. */
export function errorText(error: Error) {
  try {
    const body = JSON.parse(error.message) as { error?: string };
    if (body.error) return body.error;
  } catch {
    if (error.message && error.message.length < 300) return error.message;
  }
  return "Không gửi được tin nhắn. Kiểm tra mạng rồi thử lại.";
}

const TOOL_BUSY: Record<string, string> = {
  "tool-lookupWord": "Đang tra từ điển…",
  "tool-searchMyWords": "Đang xem sổ từ của bạn…",
  "tool-getStudyFocus": "Đang chọn từ cho bạn luyện…",
  "tool-suggestWord": "Đang chuẩn bị thẻ từ…",
};

const hasText = (m: ChatMessage) => m.parts.some((p) => p.type === "text" && p.text.trim());

function Thinking({ label }: { label?: string }) {
  return (
    <span className="flex items-center gap-2 py-0.5 text-sm text-fg-muted" role="status">
      <span className="flex gap-1.5" aria-hidden>
        <span className="size-1.5 animate-pulse rounded-full bg-fg-muted [animation-delay:-0.4s] [animation-duration:1.4s]" />
        <span className="size-1.5 animate-pulse rounded-full bg-fg-muted [animation-delay:-0.2s] [animation-duration:1.4s]" />
        <span className="size-1.5 animate-pulse rounded-full bg-fg-muted [animation-duration:1.4s]" />
      </span>
      {label ?? <span className="sr-only">Gia sư đang trả lời</span>}
    </span>
  );
}

export function ChatView({
  threadId,
  language,
  initialMessages,
  initialPrompt,
  aiEnabled,
  starters,
}: {
  threadId: string;
  language: LangCode;
  initialMessages: ChatMessage[];
  initialPrompt?: string;
  aiEnabled: boolean;
  starters: ChatStarter[];
}) {
  const prefs = useOptionalMe()?.prefs;
  const mascot = prefs?.mascot !== false;
  const tutorName = mascot ? (prefs?.mascot_name ?? "Bin") : "Gia sư";
  const router = useRouter();
  const titled = useRef(false);
  const [transport] = useState(
    () =>
      new DefaultChatTransport<ChatMessage>({
        api: "/api/chat",
        // History lives on the server; send only the new message.
        prepareSendMessagesRequest: ({ messages, id }) => ({ body: { id, message: messages.at(-1) } }),
      }),
  );
  const { messages, sendMessage, status, error, stop, regenerate, clearError } = useChat<ChatMessage>({
    id: threadId,
    messages: initialMessages,
    transport,
    // The server titles the thread from the first message; refresh so the header shows it.
    onFinish: () => {
      if (!initialMessages.length && !titled.current) {
        titled.current = true;
        router.refresh();
      }
    },
  });
  const [input, setInput] = useState("");
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const endRef = useRef<HTMLDivElement>(null);
  const busy = status === "submitted" || status === "streaming";

  // "Hỏi gia sư" buttons and the tutor home open a thread with ?q=…: send it once, then drop it from the URL.
  const sentInitial = useRef(false);
  useEffect(() => {
    if (sentInitial.current || !initialPrompt || initialMessages.length || !aiEnabled) return;
    sentInitial.current = true;
    void sendMessage({ text: initialPrompt });
    router.replace(`/chat/${threadId}`, { scroll: false });
  }, [initialPrompt, initialMessages.length, aiEnabled, sendMessage, router, threadId]);

  // Follow the answer while it streams, unless the user scrolled up to read.
  useEffect(() => {
    const nearBottom = window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 240;
    if (nearBottom || status === "submitted") endRef.current?.scrollIntoView({ block: "end" });
  }, [messages, status]);

  const send = (text: string) => {
    const t = text.trim();
    if (!t || busy || t.length > CHAT_MAX_CHARS) return;
    if (error) clearError();
    void sendMessage({ text: t });
    setInput("");
    inputRef.current?.focus();
  };
  const retry = () => {
    if (error) clearError();
    void regenerate();
  };
  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    send(input);
  };
  const pickStarter = (s: ChatStarter) => {
    if (s.send) return send(s.text);
    setInput(s.text);
    requestAnimationFrame(() => {
      const el = inputRef.current;
      el?.focus();
      el?.setSelectionRange(s.text.length, s.text.length);
    });
  };

  const last = messages.at(-1);
  // While the answer has no text yet (thinking, looking words up), the bubble shows what is going on.
  const waiting = busy && (last?.role === "user" || (last?.role === "assistant" && !hasText(last)));

  return (
    <div className="flex flex-col">
      {messages.length === 0 && (
        <div className="mb-6 space-y-4">
          <EmptyState figure="chat" title="Hôm nay mình học gì nhỉ?" className="py-4">
            Hỏi bất cứ điều gì về tiếng Anh hay tiếng Trung. {tutorName} biết những từ trong sổ của bạn.
          </EmptyState>
          {aiEnabled ? (
            <ChatStarters starters={starters} onPick={pickStarter} disabled={busy} />
          ) : (
            <p className="text-center text-sm text-danger-fg">Gia sư chưa được bật (thiếu khóa AI trên máy chủ).</p>
          )}
        </div>
      )}

      <ol className="space-y-5" aria-label="Tin nhắn" aria-live="polite">
        {messages.map((m, mi) => {
          if (m.role === "user")
            return (
              <li key={m.id} className="flex justify-end">
                <div className="max-w-[85%] rounded-2xl rounded-br-md bg-primary px-4 py-2.5 break-words whitespace-pre-wrap text-on-primary">
                  {m.parts.map((p, i) => (p.type === "text" ? <span key={i}>{p.text}</span> : null))}
                </div>
              </li>
            );
          const isLast = mi === messages.length - 1;
          const streaming = isLast && busy;
          const running = m.parts.find(
            (p) => p.type in TOOL_BUSY && "state" in p && (p.state === "input-streaming" || p.state === "input-available"),
          );
          return (
            // The tutor answers in a white bubble beside Bin.
            <li key={m.id} className="flex items-start gap-2.5">
              {mascot ? <Pup mood={streaming ? "think" : "happy"} size={32} className="mt-5" /> : <span aria-hidden className="size-8 shrink-0" />}
              <div className="min-w-0 flex-1">
                <span className="sr-only">Gia sư: </span>
                <p aria-hidden className="mb-1 text-xs font-semibold text-fg-muted">
                  {tutorName}
                </p>
                <div className="rounded-2xl rounded-tl-md bg-surface px-4 py-3 text-fg shadow-sm dark:border dark:border-border">
                  {/* Text first, word cards last: models often call the tool before writing. */}
                  {[...m.parts]
                    .sort((a, b) => Number(a.type === "tool-suggestWord") - Number(b.type === "tool-suggestWord"))
                    .map((p, i) => {
                      if (p.type === "text") return <MessageText key={i} text={p.text} />;
                      if (p.type === "tool-suggestWord" && p.state === "output-available")
                        return <SuggestWordCard key={i} word={p.output} language={p.output.language ?? language} />;
                      return null;
                    })}
                  {!hasText(m) &&
                    (streaming ? (
                      <Thinking label={running ? TOOL_BUSY[running.type] : undefined} />
                    ) : (
                      // An answer that never came (an old empty turn, or the page closed mid-answer).
                      <p className="flex flex-wrap items-center gap-2 text-sm text-fg-muted">
                        {tutorName} chưa trả lời được tin này.
                        {isLast && aiEnabled && (
                          <Button type="button" variant="outline" size="sm" onClick={retry}>
                            <RotateCcw aria-hidden />
                            Thử lại
                          </Button>
                        )}
                      </p>
                    ))}
                  {hasText(m) && streaming && running && (
                    <p className="mt-2 flex items-center gap-1.5 text-sm text-fg-muted">
                      <BookOpenCheck className="size-4" strokeWidth={1.75} aria-hidden />
                      {TOOL_BUSY[running.type]}
                    </p>
                  )}
                </div>
              </div>
            </li>
          );
        })}
        {waiting && last?.role === "user" && (
          <li className="flex items-start gap-2.5" aria-label="Gia sư đang trả lời">
            {mascot ? <Pup mood="think" size={32} className="mt-5" /> : <span aria-hidden className="size-8 shrink-0" />}
            <div>
              <p className="mb-1 text-xs font-semibold text-fg-muted">{tutorName}</p>
              <div className="rounded-2xl rounded-tl-md bg-surface px-4 py-3 shadow-sm dark:border dark:border-border">
                <Thinking />
              </div>
            </div>
          </li>
        )}
      </ol>

      {error && (
        <div role="alert" className="mt-4 flex flex-wrap items-center gap-3 rounded-md border-l-[3px] border-danger bg-danger-soft px-4 py-3 text-sm text-danger-fg">
          <span className="min-w-0 flex-1">{errorText(error)}</span>
          <Button type="button" variant="outline" size="sm" onClick={retry}>
            <RotateCcw aria-hidden />
            Thử lại
          </Button>
        </div>
      )}
      <div ref={endRef} />

      {aiEnabled && (
        <form onSubmit={onSubmit} className="sticky bottom-[calc(4.5rem+env(safe-area-inset-bottom))] z-20 mt-5 lg:bottom-4">
          <ChatComposer
            ref={inputRef}
            value={input}
            onChange={setInput}
            onSend={() => send(input)}
            onStop={() => void stop()}
            busy={busy}
          />
        </form>
      )}
    </div>
  );
}
