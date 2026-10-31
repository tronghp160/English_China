"use client";

import { BookOpenCheck, Copy, RotateCcw } from "lucide-react";
import { memo } from "react";
import { toast } from "sonner";
import { Pup } from "@/components/mascot/pup";
import { Button } from "@/components/ui/button";
import type { ChatMessage } from "@/lib/ai/chat-tools";
import type { LangCode } from "@/lib/lang/types";
import { cn } from "@/lib/utils";
import { MessageText } from "./message-text";
import { SuggestWordCard } from "./suggest-word-card";
import { hasText } from "./use-tutor-chat";

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

export const TOOL_BUSY: Record<string, string> = {
  "tool-lookupWord": "Đang tra từ điển…",
  "tool-searchMyWords": "Đang xem sổ từ của bạn…",
  "tool-getStudyFocus": "Đang chọn từ cho bạn luyện…",
  "tool-suggestWord": "Đang chuẩn bị thẻ từ…",
};

export function Thinking({ label }: { label?: string }) {
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

const bubbleClasses = (isPanel: boolean) => ({
  pupSize: isPanel ? 28 : 32,
  pupMargin: isPanel ? "mt-4" : "mt-5",
  avatarPlaceholder: isPanel ? "size-7 shrink-0" : "size-8 shrink-0",
  userBubbleCls: isPanel
    ? "max-w-[92%] rounded-2xl rounded-br-md bg-primary px-3.5 py-2 break-words whitespace-pre-wrap text-[0.9375rem] text-on-primary"
    : "max-w-[85%] rounded-2xl rounded-br-md bg-primary px-4 py-2.5 break-words whitespace-pre-wrap text-on-primary",
  tutorBubbleCls: isPanel
    ? "rounded-2xl rounded-tl-md bg-surface px-3.5 py-2.5 text-[0.9375rem] text-fg shadow-sm dark:border dark:border-border"
    : "rounded-2xl rounded-tl-md bg-surface px-4 py-3 text-fg shadow-sm dark:border dark:border-border",
});

type RowProps = {
  message: ChatMessage;
  isLast: boolean;
  streaming: boolean;
  onRetry?: () => void;
  language: LangCode;
  aiEnabled: boolean;
  tutorName: string;
  mascot: boolean;
  isPanel: boolean;
  renderAnswerActions?: (message: ChatMessage, isLast: boolean) => React.ReactNode;
};

/**
 * One message. Memoized: useChat keeps the objects of finished messages, so while an answer
 * streams only its own row re-renders (the props here are primitives or stable callbacks).
 */
const MessageRow = memo(function MessageRow({
  message: m,
  isLast,
  streaming,
  onRetry,
  language,
  aiEnabled,
  tutorName,
  mascot,
  isPanel,
  renderAnswerActions,
}: RowProps) {
  const { pupSize, pupMargin, avatarPlaceholder, userBubbleCls, tutorBubbleCls } = bubbleClasses(isPanel);

  if (m.role === "user") {
    return (
      <li className="flex justify-end">
        <div className={userBubbleCls}>
          {m.parts.map((p, i) => (p.type === "text" ? <span key={i}>{p.text}</span> : null))}
        </div>
      </li>
    );
  }

  const running = m.parts.find(
    (p) =>
      p.type in TOOL_BUSY &&
      "state" in p &&
      (p.state === "input-streaming" || p.state === "input-available"),
  );
  const hasContent = hasText(m);

  return (
    <li className="flex items-start gap-2.5">
      {mascot ? (
        <Pup mood={streaming ? "think" : "happy"} size={pupSize} className={pupMargin} />
      ) : (
        <span aria-hidden className={avatarPlaceholder} />
      )}
      <div className="min-w-0 flex-1">
        <span className="sr-only">Gia sư: </span>
        <p aria-hidden className="mb-1 text-xs font-semibold text-fg-muted">
          {tutorName}
        </p>
        <div className={tutorBubbleCls}>
          {[...m.parts]
            .sort(
              (a, b) =>
                Number(a.type === "tool-suggestWord") - Number(b.type === "tool-suggestWord"),
            )
            .map((p, i) => {
              if (p.type === "text") return <MessageText key={i} text={p.text} />;
              if (p.type === "tool-suggestWord" && p.state === "output-available") {
                return (
                  <SuggestWordCard
                    key={i}
                    word={p.output}
                    language={p.output.language ?? language}
                    size={isPanel ? "sm" : "default"}
                  />
                );
              }
              return null;
            })}
          {!hasContent &&
            (streaming ? (
              <Thinking label={running ? TOOL_BUSY[running.type] : undefined} />
            ) : (
              <p className="flex flex-wrap items-center gap-2 text-sm text-fg-muted">
                {tutorName} chưa trả lời được tin này.
                {isLast && aiEnabled && onRetry && (
                  <Button type="button" variant="outline" size="sm" onClick={onRetry}>
                    <RotateCcw aria-hidden />
                    Thử lại
                  </Button>
                )}
              </p>
            ))}
          {hasContent && streaming && running && (
            <p className="mt-2 flex items-center gap-1.5 text-sm text-fg-muted">
              <BookOpenCheck className="size-4" strokeWidth={1.75} aria-hidden />
              {TOOL_BUSY[running.type]}
            </p>
          )}
        </div>
        {!streaming && hasContent && !isPanel && (
          <div className="mt-1 flex items-center gap-1">
            <Button
              type="button"
              variant="ghost"
              size="icon"
              aria-label="Sao chép câu trả lời"
              className="size-10 rounded-full text-fg-muted hover:text-fg"
              onClick={() => {
                const text = m.parts
                  .filter((p) => p.type === "text")
                  .map((p) => p.text)
                  .join("\n\n");
                void navigator.clipboard.writeText(text);
                toast.success("Đã sao chép");
              }}
            >
              <Copy className="size-4" aria-hidden />
            </Button>
            {isLast && onRetry && aiEnabled && (
              <Button
                type="button"
                variant="ghost"
                size="icon"
                aria-label="Trả lời lại"
                className="size-10 rounded-full text-fg-muted hover:text-fg"
                onClick={onRetry}
              >
                <RotateCcw className="size-4" aria-hidden />
              </Button>
            )}
          </div>
        )}
        {renderAnswerActions?.(m, isLast)}
      </div>
    </li>
  );
});

export function ChatMessages({
  messages,
  busy,
  waiting,
  error,
  onRetry,
  language,
  aiEnabled,
  tutorName,
  mascot = true,
  density = "page",
  renderAnswerActions,
  className,
}: {
  messages: ChatMessage[];
  busy: boolean;
  waiting: boolean;
  error?: Error;
  onRetry?: () => void;
  language: LangCode;
  aiEnabled: boolean;
  tutorName: string;
  mascot?: boolean;
  density?: "page" | "panel";
  renderAnswerActions?: (message: ChatMessage, isLast: boolean) => React.ReactNode;
  className?: string;
}) {
  const isPanel = density === "panel";
  const { pupSize, pupMargin, avatarPlaceholder, tutorBubbleCls } = bubbleClasses(isPanel);

  return (
    <div className={cn("flex flex-col", className)}>
      <ol
        className={cn(isPanel ? "space-y-4" : "space-y-5")}
        aria-label="Tin nhắn"
        aria-live="polite"
      >
        {messages.map((m, mi) => {
          const isLast = mi === messages.length - 1;
          return (
            <MessageRow
              key={m.id}
              message={m}
              isLast={isLast}
              streaming={isLast && busy}
              onRetry={onRetry}
              language={language}
              aiEnabled={aiEnabled}
              tutorName={tutorName}
              mascot={mascot}
              isPanel={isPanel}
              renderAnswerActions={renderAnswerActions}
            />
          );
        })}
        {waiting && messages.at(-1)?.role === "user" && (
          <li className="flex items-start gap-2.5" aria-label="Gia sư đang trả lời">
            {mascot ? (
              <Pup mood="think" size={pupSize} className={pupMargin} />
            ) : (
              <span aria-hidden className={avatarPlaceholder} />
            )}
            <div>
              <p className="mb-1 text-xs font-semibold text-fg-muted">{tutorName}</p>
              <div className={tutorBubbleCls}>
                <Thinking />
              </div>
            </div>
          </li>
        )}
      </ol>

      {error && (
        <div
          role="alert"
          className="mt-4 flex flex-wrap items-center gap-3 rounded-md border-l-[3px] border-danger bg-danger-soft px-4 py-3 text-sm text-danger-fg"
        >
          <span className="min-w-0 flex-1">{errorText(error)}</span>
          {onRetry && (
            <Button type="button" variant="outline" size="sm" onClick={onRetry}>
              <RotateCcw aria-hidden />
              Thử lại
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
