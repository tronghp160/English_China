"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { ChatComposer } from "@/components/chat/chat-composer";
import { ChatMessages } from "@/components/chat/chat-messages";
import { useFollowScroll } from "@/components/chat/use-follow-scroll";
import { useTutorChat } from "@/components/chat/use-tutor-chat";
import type { ChatMessage } from "@/lib/ai/chat-tools";
import { FOLLOW_UPS } from "@/lib/ai/tutor/starters";
import type { LangCode } from "@/lib/lang/types";

export function TutorPanelChat({
  threadId,
  language,
  initialMessages,
  initialPrompt,
  aiEnabled,
  tutorName,
  mascot = true,
  onBusyChange,
  onAnswerEnd,
}: {
  threadId: string;
  language: LangCode;
  initialMessages: ChatMessage[];
  initialPrompt?: string;
  aiEnabled: boolean;
  tutorName: string;
  mascot?: boolean;
  onBusyChange?: (busy: boolean) => void;
  onAnswerEnd?: () => void;
}) {
  const { messages, status, busy, waiting, error, send, retry, stop, lastHasText } = useTutorChat({
    threadId,
    initialMessages,
    initialPrompt,
    aiEnabled,
    prepareContext: () => ({ path: window.location.pathname }),
  });

  const [input, setInput] = useState("");
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const endRef = useFollowScroll(messages, {
    container: containerRef,
    force: status === "submitted",
  });

  // Notify parent of busy state changes
  useEffect(() => {
    onBusyChange?.(busy);
  }, [busy, onBusyChange]);

  // Track answer completion to trigger unread badge if panel is closed
  const wasStreaming = useRef(false);
  useEffect(() => {
    if (status === "streaming") {
      wasStreaming.current = true;
    } else if (wasStreaming.current && status === "ready") {
      wasStreaming.current = false;
      onAnswerEnd?.();
    }
  }, [status, onAnswerEnd]);

  const handleSend = (text: string) => {
    send(text);
    setInput("");
    inputRef.current?.focus();
  };

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    handleSend(input);
  };

  const lastMessage = messages.at(-1);
  const showFollowUps = !busy && lastMessage?.role === "assistant" && lastHasText;

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      <div ref={containerRef} className="flex-1 overflow-y-auto overscroll-contain px-4 py-4">
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
          density="panel"
        />

        {/* Follow-up chips for panel (show first 2) */}
        {showFollowUps && (
          <div className="mt-3 flex flex-wrap gap-2 pl-9">
            {FOLLOW_UPS.slice(0, 2).map((fu, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => handleSend(fu)}
                className="inline-flex min-h-10 items-center rounded-full border border-border/80 bg-surface px-3 text-sm font-medium text-fg shadow-xs transition-colors hover:border-primary/50 hover:bg-surface-2 focus-visible:outline-2 focus-visible:outline-primary"
              >
                {fu}
              </button>
            ))}
          </div>
        )}

        <div ref={endRef} />
      </div>

      {aiEnabled && (
        <form
          onSubmit={onSubmit}
          className="border-t border-border/60 bg-surface p-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))]"
        >
          <ChatComposer
            ref={inputRef}
            value={input}
            onChange={setInput}
            onSend={() => handleSend(input)}
            onStop={stop}
            busy={busy}
            size="panel"
            inputId="tutor-panel-input"
            placeholder={messages.length === 0 ? `Hỏi ${tutorName} bất cứ điều gì…` : "Hỏi tiếp…"}
          />
          <p className="mt-1.5 text-center text-[0.8125rem] text-fg-subtle">
            Gia sư AI có thể nhầm. Kiểm tra lại từ quan trọng.
          </p>
        </form>
      )}
    </div>
  );
}
