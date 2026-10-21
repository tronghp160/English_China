"use client";

import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import { ArrowUp, BookOpenCheck, RotateCcw, Square } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, type FormEvent, type KeyboardEvent } from "react";
import { CHAT_MAX_CHARS } from "@/lib/ai/chat-prompt";
import type { ChatMessage } from "@/lib/ai/chat-tools";
import { LANGUAGES } from "@/lib/lang/registry";
import type { LangCode } from "@/lib/lang/types";
import { cn } from "@/lib/utils";
import { MessageText } from "./message-text";
import { SuggestWordCard } from "./suggest-word-card";

type Starter = { label: string; emoji: string; text: string; send: boolean };

function starters(language: LangCode): Starter[] {
  const label = LANGUAGES[language].label.toLowerCase();
  return [
    { emoji: "🎭", label: "Luyện hội thoại với từ hay quên", text: "Mình muốn luyện một đoạn hội thoại ngắn dùng các từ mình hay quên.", send: true },
    { emoji: "⚡", label: "Kiểm tra nhanh 5 từ đến hạn", text: "Kiểm tra nhanh mình 5 từ đến hạn ôn nhé, hỏi từng câu một.", send: true },
    { emoji: "✍️", label: "Sửa câu giúp mình", text: `Sửa giúp mình câu ${label} này: `, send: false },
    { emoji: "🔍", label: "Phân biệt hai từ hay nhầm", text: "Phân biệt giúp mình hai từ: ", send: false },
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
        <div className="notebook-card flex flex-col items-center px-5 py-8 text-center">
          <span aria-hidden className="animate-float text-5xl">
            🧑‍🏫
          </span>
          <p className="mt-3 font-heading text-lg font-black text-ink">Hôm nay mình học gì nhỉ?</p>
          <p className="mt-1 max-w-sm text-sm text-ink-soft">
            Hỏi về một từ, nhờ sửa câu, hay luyện hội thoại với chính những từ trong sổ của bạn.
          </p>
          {aiEnabled ? (
            <ul className="mt-5 grid w-full gap-2 sm:grid-cols-2">
              {starters(language).map((s) => (
                <li key={s.label}>
                  <button
                    type="button"
                    onClick={() => pickStarter(s)}
                    className="flex min-h-12 w-full items-center gap-2 rounded-btn border border-rule bg-surface px-3 text-left text-sm font-semibold text-ink transition-colors hover:bg-muted"
                  >
                    <span aria-hidden>{s.emoji}</span>
                    {s.label}
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-4 text-sm text-danger">Gia sư chưa được bật (thiếu khóa AI trên máy chủ).</p>
          )}
        </div>
      )}

      <ol className="space-y-4" aria-label="Tin nhắn" aria-live="polite">
        {messages.map((m) =>
          m.role === "user" ? (
            <li key={m.id} className="flex justify-end">
              <div className="max-w-[85%] rounded-card rounded-br-md bg-primary px-4 py-2.5 whitespace-pre-wrap text-primary-foreground">
                {m.parts.map((p, i) => (p.type === "text" ? <span key={i}>{p.text}</span> : null))}
              </div>
            </li>
          ) : (
            <li key={m.id} className="flex items-start gap-2">
              <span aria-hidden className="icon-tile mt-0.5 size-9 shrink-0 bg-wash-grape text-lg">
                🧑‍🏫
              </span>
              <div className="min-w-0 max-w-[85%] rounded-card rounded-tl-md border border-rule bg-surface px-4 py-2.5 text-ink shadow-card">
                <span className="sr-only">Gia sư: </span>
                {/* Text first, word cards last: models often call the tool before writing. */}
                {[...m.parts].sort((a, b) => Number(a.type === "tool-suggestWord") - Number(b.type === "tool-suggestWord")).map((p, i) => {
                  if (p.type === "text") return <MessageText key={i} text={p.text} />;
                  if (p.type === "tool-suggestWord" && p.state === "output-available")
                    return <SuggestWordCard key={i} word={p.output} language={language} />;
                  if (p.type in TOOL_BUSY && "state" in p && (p.state === "input-streaming" || p.state === "input-available"))
                    return (
                      <p key={i} className="flex items-center gap-1.5 py-1 text-sm text-ink-soft">
                        <BookOpenCheck className="size-4 animate-pulse" aria-hidden />
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
          <li className="flex items-center gap-2" aria-label="Gia sư đang trả lời">
            <span aria-hidden className="icon-tile size-9 bg-wash-grape text-lg">
              🧑‍🏫
            </span>
            <span className="flex gap-1 rounded-card border border-rule bg-surface px-4 py-3.5 shadow-card" aria-hidden>
              <span className="size-2 animate-bounce rounded-full bg-ink-soft [animation-delay:-0.3s]" />
              <span className="size-2 animate-bounce rounded-full bg-ink-soft [animation-delay:-0.15s]" />
              <span className="size-2 animate-bounce rounded-full bg-ink-soft" />
            </span>
          </li>
        )}
      </ol>

      {error && (
        <div role="alert" className="mt-4 flex flex-wrap items-center gap-3 rounded-card bg-wash-red px-4 py-3 text-sm text-danger">
          <span className="flex-1">{errorText(error)}</span>
          <button
            type="button"
            onClick={() => void regenerate()}
            className="inline-flex min-h-11 items-center gap-1.5 rounded-btn bg-surface px-3 font-bold text-ink"
          >
            <RotateCcw className="size-4" aria-hidden />
            Thử lại
          </button>
        </div>
      )}
      <div ref={endRef} />

      {aiEnabled && (
        <form
          onSubmit={onSubmit}
          className="sticky bottom-[calc(4.5rem+env(safe-area-inset-bottom))] z-20 mt-5 lg:bottom-4"
        >
          <div className="flex items-end gap-2 rounded-sheet border border-rule bg-surface p-2 shadow-pop">
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
              className="field-sizing-content max-h-40 min-h-11 flex-1 resize-none bg-transparent px-3 py-2.5 text-base text-ink outline-none placeholder:text-ink-soft"
            />
            {busy ? (
              <button
                type="button"
                onClick={() => void stop()}
                aria-label="Dừng trả lời"
                className="grid size-11 shrink-0 place-items-center rounded-full bg-muted text-ink"
              >
                <Square className="size-4 fill-current" aria-hidden />
              </button>
            ) : (
              <button
                type="submit"
                aria-label="Gửi"
                disabled={!input.trim()}
                className={cn(
                  "btn-3d grid size-11 shrink-0 place-items-center rounded-full bg-primary text-primary-foreground [--edge-color:var(--ink-blue-shade)]",
                  "disabled:opacity-40",
                )}
              >
                <ArrowUp className="size-5" strokeWidth={2.5} aria-hidden />
              </button>
            )}
          </div>
          {input.length > CHAT_MAX_CHARS - 200 && (
            <p className="mt-1 px-3 text-right text-xs text-ink-soft">
              {input.length}/{CHAT_MAX_CHARS}
            </p>
          )}
        </form>
      )}
    </div>
  );
}
