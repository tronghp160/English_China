"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { useOptionalMe } from "@/components/app-shell/me-provider";
import { EmptyState } from "@/components/ui/empty-state";
import type { ChatMessage } from "@/lib/ai/chat-tools";
import type { ChatStarter } from "@/lib/ai/tutor/starters";
import type { LangCode } from "@/lib/lang/types";
import { ChatComposer } from "./chat-composer";
import { ChatMessages, errorText } from "./chat-messages";
import { ChatStarters } from "./chat-starters";
import { useFollowScroll } from "./use-follow-scroll";
import { useTutorChat } from "./use-tutor-chat";

export { errorText };

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

  const { messages, status, busy, waiting, error, send, retry, stop } = useTutorChat({
    threadId,
    initialMessages,
    initialPrompt,
    aiEnabled,
    onFirstAnswer: () => router.refresh(),
  });

  const [input, setInput] = useState("");
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const endRef = useFollowScroll(messages, { force: status === "submitted" });

  const replacedInitial = useRef(false);
  useEffect(() => {
    if (initialPrompt && !replacedInitial.current) {
      replacedInitial.current = true;
      router.replace(`/chat/${threadId}`, { scroll: false });
    }
  }, [initialPrompt, router, threadId]);

  const handleSend = (text: string) => {
    send(text);
    setInput("");
    inputRef.current?.focus();
  };

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    handleSend(input);
  };

  const pickStarter = (s: ChatStarter) => {
    if (s.send) return handleSend(s.text);
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
      <div ref={endRef} />

      {aiEnabled && (
        <form
          onSubmit={onSubmit}
          className="sticky bottom-[calc(4.5rem+env(safe-area-inset-bottom))] z-20 mt-5 lg:bottom-4"
        >
          <ChatComposer
            ref={inputRef}
            value={input}
            onChange={setInput}
            onSend={() => handleSend(input)}
            onStop={stop}
            busy={busy}
            size="page"
          />
        </form>
      )}
    </div>
  );
}
