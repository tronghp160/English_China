"use client";

import type { UIMessage } from "ai";
import { Copy, GraduationCap, RotateCcw } from "lucide-react";
import Link from "next/link";
import { memo } from "react";
import { toast } from "sonner";
import { errorText, Thinking } from "@/components/chat/chat-messages";
import { MessageText } from "@/components/chat/message-text";
import { Button } from "@/components/ui/button";
import { CHAT_MAX_CHARS } from "@/lib/ai/chat-prompt";
import { splitBubbles } from "@/lib/ai/clone/bubbles";
import { cn } from "@/lib/utils";
import { hasText } from "./use-clone-chat";

/** The round letter badge (the first letter is CSS content, so it is not read out or matched as a link/button label). */
export function CloneAvatar({ name, className }: { name: string; className?: string }) {
  return (
    <span
      aria-hidden
      data-initials={name.trim().charAt(0).toUpperCase()}
      className={cn(
        "grid shrink-0 place-items-center rounded-full bg-primary-soft font-extrabold text-primary-fg after:content-[attr(data-initials)]",
        className,
      )}
    />
  );
}

const BUBBLE =
  "w-fit max-w-[85%] rounded-2xl bg-surface px-4 py-2.5 text-fg shadow-sm break-words dark:border dark:border-border";

const textOf = (m: UIMessage) =>
  m.parts
    .filter((p): p is Extract<typeof p, { type: "text" }> => p.type === "text")
    .map((p) => p.text)
    .join("\n\n");

type RowProps = {
  message: UIMessage;
  name: string;
  tutorName: string;
  isLast: boolean;
  streaming: boolean;
  onRetry?: () => void;
  /** The learner's question before this answer, for the "ask the tutor" link. */
  question?: string;
};

/** One message. Memoized: while an answer streams only its own row renders again. */
const CloneRow = memo(function CloneRow({ message: m, name, tutorName, isLast, streaming, onRetry, question }: RowProps) {
  if (m.role === "user") {
    return (
      <li className="flex justify-end">
        <div
          data-check-overflow
          className="max-w-[85%] rounded-2xl rounded-br-md bg-primary px-4 py-2.5 break-words whitespace-pre-wrap text-on-primary"
        >
          {textOf(m)}
        </div>
      </li>
    );
  }

  const text = textOf(m);
  const bubbles = splitBubbles(text);
  const content = hasText(m);
  // The companion sends deep study questions to the tutor; a button opens it with the question filled in.
  const mentionsTutor = !streaming && content && /gia sư/i.test(text);

  return (
    <li className="flex items-start gap-2.5">
      <CloneAvatar name={name} className="mt-5 size-8 text-sm" />
      <div className="min-w-0 flex-1">
        <span className="sr-only">{name} (bản AI): </span>
        <p aria-hidden className="mb-1 text-xs font-semibold text-fg-muted">
          {name} (bản AI)
        </p>
        {content ? (
          <div className="flex flex-col items-start gap-1">
            {bubbles.map((b, i) => (
              <div key={i} data-check-overflow className={cn(BUBBLE, i === 0 && "rounded-tl-md")}>
                <MessageText text={b} />
              </div>
            ))}
          </div>
        ) : streaming ? (
          <div className={cn(BUBBLE, "rounded-tl-md")}>
            <Thinking label="Đang nhắn…" />
          </div>
        ) : (
          <p className="flex flex-wrap items-center gap-2 text-sm text-fg-muted">
            {name} chưa trả lời được tin này.
            {isLast && onRetry && (
              <Button type="button" variant="outline" size="sm" onClick={onRetry}>
                <RotateCcw aria-hidden />
                Thử lại
              </Button>
            )}
          </p>
        )}
        {!streaming && content && (
          <div className="mt-1 flex flex-wrap items-center gap-1">
            <Button
              type="button"
              variant="ghost"
              size="icon"
              aria-label="Sao chép câu trả lời"
              className="size-10 rounded-full text-fg-muted hover:text-fg"
              onClick={() => {
                void navigator.clipboard.writeText(text);
                toast.success("Đã sao chép");
              }}
            >
              <Copy className="size-4" aria-hidden />
            </Button>
            {isLast && onRetry && (
              <Button type="button" variant="ghost" size="icon" aria-label="Trả lời lại" className="size-10 rounded-full text-fg-muted hover:text-fg" onClick={onRetry}>
                <RotateCcw className="size-4" aria-hidden />
              </Button>
            )}
            {mentionsTutor && (
              <Button asChild variant="soft" tone="blue" size="sm">
                <Link href={`/chat?q=${encodeURIComponent((question ?? "").slice(0, CHAT_MAX_CHARS))}`}>
                  <GraduationCap aria-hidden />
                  Hỏi {tutorName} cho kỹ
                </Link>
              </Button>
            )}
          </div>
        )}
      </div>
    </li>
  );
});

/** The conversation: each paragraph of an answer is its own bubble, like text messages. */
export function CloneMessages({
  messages,
  busy,
  waiting,
  error,
  locked = false,
  onRetry,
  name,
  tutorName,
}: {
  messages: UIMessage[];
  busy: boolean;
  waiting: boolean;
  error?: Error;
  /** The account has no access (any more): the message says so and there is nothing to retry. */
  locked?: boolean;
  onRetry: () => void;
  name: string;
  tutorName: string;
}) {
  return (
    <div className="flex flex-col">
      <ol className="space-y-5" aria-label="Tin nhắn" aria-live="polite">
        {messages.map((m, i) => (
          <CloneRow
            key={m.id}
            message={m}
            name={name}
            tutorName={tutorName}
            isLast={i === messages.length - 1}
            streaming={i === messages.length - 1 && busy}
            onRetry={onRetry}
            question={m.role === "assistant" ? textOf(messages.slice(0, i).findLast((x) => x.role === "user") ?? { ...m, parts: [] }) : undefined}
          />
        ))}
        {waiting && messages.at(-1)?.role === "user" && (
          <li className="flex items-start gap-2.5" aria-label={`${name} đang trả lời`}>
            <CloneAvatar name={name} className="mt-5 size-8 text-sm" />
            <div>
              <p className="mb-1 text-xs font-semibold text-fg-muted">{name} (bản AI)</p>
              <div className={cn(BUBBLE, "rounded-tl-md")}>
                <Thinking label="Đang nhắn…" />
              </div>
            </div>
          </li>
        )}
      </ol>
      {error && (
        <div role="alert" className="mt-4 flex flex-wrap items-center gap-3 rounded-md border-l-[3px] border-danger bg-danger-soft px-4 py-3 text-sm text-danger-fg">
          <span className="min-w-0 flex-1">{errorText(error)}</span>
          {!locked && (
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
