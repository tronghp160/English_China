"use client";

import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import { ArrowUp, BookOpenCheck, Drama, PenLine, RotateCcw, Search, Square, Zap, type LucideIcon } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, type FormEvent, type KeyboardEvent } from "react";
import { useOptionalMe } from "@/components/app-shell/me-provider";
import { Pup } from "@/components/mascot/pup";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { CHAT_MAX_CHARS } from "@/lib/ai/chat-prompt";
import type { ChatMessage } from "@/lib/ai/chat-tools";
import { LANGUAGES } from "@/lib/lang/registry";
import { TONES } from "@/lib/tone";
import type { LangCode } from "@/lib/lang/types";
import { MessageText } from "./message-text";
import { SuggestWordCard } from "./suggest-word-card";

type Starter = { label: string; icon: LucideIcon; text: string; send: boolean };

function starters(language: LangCode): Starter[] {
  const label = LANGUAGES[language].label.toLowerCase();
  return [
    { icon: Drama, label: "Luyện hội thoại với từ hay quên", text: "Mình muốn luyện một đoạn hội thoại ngắn dùng các từ mình hay quên.", send: true },
    { icon: Zap, label: "Kiểm tra nhanh 5 từ đến hạn", text: "Kiểm tra nhanh mình 5 từ đến hạn ôn nhé, hỏi từng câu một.", send: true },
    { icon: PenLine, label: "Sửa câu giúp mình", text: `Sửa giúp mình câu ${label} này: `, send: false },
    { icon: Search, label: "Phân biệt hai từ hay nhầm", text: "Phân biệt giúp mình hai từ: ", send: false },
  ];
}

/** Server errors arrive as the JSON body ({ error }) or as the stream's error text. */
function errorText(error: Error) {
  try {
    const body = JSON.parse(error.message) as { error?: string };
    if (body.error) return body.error;
  } catch {
    if (error.message && error.message.length < 200) return error.message;
  }
  return "Không gửi được tin nhắn. Kiểm tra mạng rồi thử lại.";
}

const TOOL_BUSY: Record<string, string> = {
  "tool-searchMyWords": "Đang xem sổ từ của bạn…",
  "tool-getStudyFocus": "Đang chọn từ cho bạn luyện…",
  "tool-suggestWord": "Đang chuẩn bị thẻ từ…",
};

export function ChatView({
  threadId,
  language,
  initialMessages,
  initialPrompt,
  aiEnabled,
}: {
  threadId: string;
  language: LangCode;
  initialMessages: ChatMessage[];
  initialPrompt?: string;
  aiEnabled: boolean;
}) {
  const mascot = useOptionalMe()?.prefs.mascot !== false;
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

  // "Hỏi gia sư" buttons open a new thread with ?q=…: send it once, then drop it from the URL.
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
  };
  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    send(input);
  };
  const onKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    // Enter sends on devices with a keyboard; never while an IME (Telex, pinyin) is composing.
    if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing && window.matchMedia("(pointer: fine)").matches) {
      e.preventDefault();
      send(input);
    }
  };
  const pickStarter = (s: Starter) => {
    if (s.send) return send(s.text);
    setInput(s.text);
    requestAnimationFrame(() => {
      const el = inputRef.current;
      el?.focus();
      el?.setSelectionRange(s.text.length, s.text.length);
    });
  };

  return (
    <div className="flex flex-col">
      {messages.length === 0 && (
        <EmptyState figure="chat" title="Hôm nay mình học gì nhỉ?" className="py-6">
          Hỏi về một từ, nhờ sửa câu, hay luyện hội thoại với chính những từ trong sổ của bạn.
        </EmptyState>
      )}
      {messages.length === 0 &&
        (aiEnabled ? (
          <ul className="grid w-full gap-2 sm:grid-cols-2">
            {starters(language).map((s, i) => (
              <li key={s.label}>
                <Button type="button" variant="soft" tone={TONES[(i * 2) % 8]} onClick={() => pickStarter(s)} className="h-auto min-h-12 w-full justify-start rounded-lg py-2.5 whitespace-normal">
                  <s.icon aria-hidden />
                  {s.label}
                </Button>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-center text-sm text-danger-fg">Gia sư chưa được bật (thiếu khóa AI trên máy chủ).</p>
        ))}

      <ol className="space-y-5" aria-label="Tin nhắn" aria-live="polite">
        {messages.map((m, mi) =>
          m.role === "user" ? (
            <li key={m.id} className="flex justify-end">
              <div className="max-w-[85%] rounded-2xl rounded-br-md bg-primary px-4 py-2.5 whitespace-pre-wrap text-on-primary">
                {m.parts.map((p, i) => (p.type === "text" ? <span key={i}>{p.text}</span> : null))}
              </div>
            </li>
          ) : (
            // The tutor answers in a white bubble beside Bin.
            <li key={m.id} className="flex items-start gap-2.5">
              {mascot ? <Pup mood="happy" size={32} className="mt-1" /> : <span aria-hidden className="size-8 shrink-0" />}
              <span className="sr-only">Gia sư: </span>
              <div className="min-w-0 flex-1 rounded-2xl rounded-bl-md bg-surface px-4 py-3 text-fg shadow-sm dark:border dark:border-border">
                {/* Text first, word cards last: models often call the tool before writing. */}
                {[...m.parts].sort((a, b) => Number(a.type === "tool-suggestWord") - Number(b.type === "tool-suggestWord")).map((p, i) => {
                  if (p.type === "text") return <MessageText key={i} text={p.text} />;
                  if (p.type === "tool-suggestWord" && p.state === "output-available")
                    return <SuggestWordCard key={i} word={p.output} language={language} />;
                  if (p.type in TOOL_BUSY && "state" in p && (p.state === "input-streaming" || p.state === "input-available"))
                    return (
                      <p key={i} className="flex items-center gap-1.5 py-1 text-sm text-fg-muted">
                        <BookOpenCheck className="size-4" strokeWidth={1.75} aria-hidden />
                        {TOOL_BUSY[p.type]}
                      </p>
                    );
                  return null;
                })}
              </div>
            </li>
          ),
        )}
        {status === "submitted" && (
          <li className="flex items-center gap-2.5" aria-label="Gia sư đang trả lời">
            {mascot ? <Pup mood="think" size={32} /> : <span aria-hidden className="size-8 shrink-0" />}
            <span className="flex gap-1.5 rounded-2xl rounded-bl-md bg-surface px-4 py-3.5 shadow-sm" aria-hidden>
              <span className="size-1.5 animate-pulse rounded-full bg-fg-muted [animation-duration:1.4s] [animation-delay:-0.4s]" />
              <span className="size-1.5 animate-pulse rounded-full bg-fg-muted [animation-duration:1.4s] [animation-delay:-0.2s]" />
              <span className="size-1.5 animate-pulse rounded-full bg-fg-muted [animation-duration:1.4s]" />
            </span>
          </li>
        )}
      </ol>

      {error && (
        <div role="alert" className="mt-4 flex flex-wrap items-center gap-3 rounded-md border-l-[3px] border-danger bg-danger-soft px-4 py-3 text-sm text-danger-fg">
          <span className="flex-1">{errorText(error)}</span>
          <Button type="button" variant="outline" size="sm" onClick={() => void regenerate()}>
            <RotateCcw aria-hidden />
            Thử lại
          </Button>
        </div>
      )}
      <div ref={endRef} />

      {aiEnabled && (
        <form
          onSubmit={onSubmit}
          className="sticky bottom-[calc(4.5rem+env(safe-area-inset-bottom))] z-20 mt-5 lg:bottom-4"
        >
          <div className="flex items-end gap-2 rounded-3xl border border-border/60 bg-surface p-2 shadow-lg dark:border-border">
            <label htmlFor="chat-input" className="sr-only">
              Tin nhắn cho gia sư
            </label>
            <textarea
              id="chat-input"
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={onKeyDown}
              rows={1}
              maxLength={CHAT_MAX_CHARS}
              placeholder="Hỏi gia sư…"
              className="field-sizing-content max-h-40 min-h-11 flex-1 resize-none bg-transparent px-3 py-2.5 text-base text-fg outline-none placeholder:text-fg-subtle"
            />
            {busy ? (
              <Button type="button" variant="secondary" size="icon" onClick={() => void stop()} aria-label="Dừng trả lời" className="size-10 shrink-0 rounded-full">
                <Square className="size-4 fill-current" aria-hidden />
              </Button>
            ) : (
              <Button type="submit" size="icon" aria-label="Gửi" disabled={!input.trim()} className="size-10 shrink-0 rounded-full">
                <ArrowUp strokeWidth={2.25} aria-hidden />
              </Button>
            )}
          </div>
          {input.length > CHAT_MAX_CHARS - 200 && (
            <p className="mt-1 px-3 text-right text-xs text-fg-muted">
              {input.length}/{CHAT_MAX_CHARS}
            </p>
          )}
        </form>
      )}
    </div>
  );
}
