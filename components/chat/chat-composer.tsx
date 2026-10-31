"use client";

import { ArrowUp, Square } from "lucide-react";
import { forwardRef, type KeyboardEvent } from "react";
import { Button } from "@/components/ui/button";
import { CHAT_MAX_CHARS } from "@/lib/ai/chat-prompt";
import { warmTutor } from "@/lib/ai/tutor/warm";
import { cn } from "@/lib/utils";

/** Enter sends on devices with a keyboard; never while an IME (Telex, pinyin) is composing. */
export function enterSends(e: KeyboardEvent<HTMLTextAreaElement>) {
  return e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing && window.matchMedia("(pointer: fine)").matches;
}

/** The message box shared by the tutor home and a thread: auto-growing textarea + round send/stop button. */
export const ChatComposer = forwardRef<
  HTMLTextAreaElement,
  {
    value: string;
    onChange: (v: string) => void;
    onSend: () => void;
    onStop?: () => void;
    busy?: boolean;
    disabled?: boolean;
    name?: string;
    placeholder?: string;
    className?: string;
    size?: "page" | "panel";
    inputId?: string;
    /** Screen-reader label; defaults by size ("Tin nhắn cho gia sư" / "… (khung nổi)"). */
    label?: string;
  }
>(function ChatComposer(
  {
    value,
    onChange,
    onSend,
    onStop,
    busy,
    disabled,
    name,
    placeholder,
    className,
    size = "page",
    inputId = "chat-input",
    label,
  },
  ref,
) {
  const isPanel = size === "panel";
  const labelText =
    label ??
    (isPanel || inputId === "tutor-panel-input"
      ? "Tin nhắn cho gia sư (khung nổi)"
      : "Tin nhắn cho gia sư");

  return (
    <div className={className}>
      <div
        className={cn(
          "flex items-end gap-2 bg-surface p-2 focus-within:border-primary dark:border-border",
          isPanel
            ? "rounded-2xl border border-border shadow-none"
            : "rounded-3xl border border-border/60 shadow-lg",
        )}
      >
        <label htmlFor={inputId} className="sr-only">
          {labelText}
        </label>
        <textarea
          id={inputId}
          ref={ref}
          name={name}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onFocus={warmTutor}
          onKeyDown={(e) => {
            if (enterSends(e)) {
              e.preventDefault();
              onSend();
            }
          }}
          rows={1}
          maxLength={CHAT_MAX_CHARS}
          placeholder={placeholder ?? "Hỏi gia sư bất cứ điều gì…"}
          className={cn(
            "field-sizing-content flex-1 resize-none bg-transparent outline-none placeholder:text-fg-subtle",
            isPanel
              ? "max-h-32 min-h-10 px-2.5 py-2 text-[0.9375rem] text-fg"
              : "max-h-40 min-h-11 px-3 py-2.5 text-base text-fg",
          )}
        />
        {busy && onStop ? (
          <Button
            type="button"
            variant="secondary"
            size="icon"
            onClick={onStop}
            aria-label="Dừng trả lời"
            className={cn("shrink-0 rounded-full", isPanel ? "size-10" : "size-11")}
          >
            <Square className="size-4 fill-current" aria-hidden />
          </Button>
        ) : (
          <Button
            type="submit"
            size="icon"
            aria-label="Gửi"
            disabled={disabled || busy || !value.trim()}
            className={cn("shrink-0 rounded-full", isPanel ? "size-10" : "size-11")}
          >
            <ArrowUp strokeWidth={2.25} aria-hidden />
          </Button>
        )}
      </div>
      {value.length > CHAT_MAX_CHARS - 200 && (
        <p className="mt-1 px-3 text-right text-xs text-fg-muted">
          {value.length}/{CHAT_MAX_CHARS}
        </p>
      )}
    </div>
  );
});
