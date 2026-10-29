"use client";

import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import { useEffect, useRef, useState } from "react";
import { CHAT_MAX_CHARS } from "@/lib/ai/chat-prompt";
import type { ChatMessage } from "@/lib/ai/chat-tools";

export const hasText = (m: ChatMessage) => m.parts.some((p) => p.type === "text" && p.text.trim());

export function useTutorChat(opts: {
  threadId: string;
  initialMessages: ChatMessage[];
  initialPrompt?: string;
  aiEnabled: boolean;
  onFirstAnswer?: () => void;
  prepareContext?: () => Record<string, unknown> | undefined;
}) {
  const { threadId, initialMessages, initialPrompt, aiEnabled, onFirstAnswer, prepareContext } = opts;
  const titled = useRef(false);

  const [transport] = useState(
    () =>
      new DefaultChatTransport<ChatMessage>({
        api: "/api/chat",
        // History lives on the server; send only the new message and optional context.
        prepareSendMessagesRequest: ({ messages, id }) => {
          const context = prepareContext?.();
          return {
            body: {
              id,
              message: messages.at(-1),
              ...(context ? { context } : {}),
            },
          };
        },
      }),
  );

  const { messages, sendMessage, status, error, stop: stopChat, regenerate, clearError } = useChat<ChatMessage>({
    id: threadId,
    messages: initialMessages,
    transport,
    // The server titles the thread from the first message; refresh so the header shows it.
    onFinish: () => {
      if (!initialMessages.length && !titled.current) {
        titled.current = true;
        onFirstAnswer?.();
      }
    },
  });

  const busy = status === "submitted" || status === "streaming";

  // Send initialPrompt once if provided
  const sentInitial = useRef(false);
  useEffect(() => {
    if (sentInitial.current || !initialPrompt || initialMessages.length || !aiEnabled) return;
    sentInitial.current = true;
    void sendMessage({ text: initialPrompt });
  }, [initialPrompt, initialMessages.length, aiEnabled, sendMessage]);

  const send = (text: string) => {
    const t = text.trim();
    if (!t || busy || t.length > CHAT_MAX_CHARS) return;
    if (error) clearError();
    void sendMessage({ text: t });
  };

  const retry = () => {
    if (error) clearError();
    void regenerate();
  };

  const stop = () => {
    void stopChat();
  };

  const last = messages.at(-1);
  const lastHasText = Boolean(last && hasText(last));
  // While the answer has no text yet (thinking, looking words up), the bubble shows what is going on.
  const waiting = busy && (last?.role === "user" || (last?.role === "assistant" && !hasText(last)));

  return {
    messages,
    status,
    busy,
    waiting,
    error,
    send,
    retry,
    stop,
    clearError,
    lastHasText,
  };
}
