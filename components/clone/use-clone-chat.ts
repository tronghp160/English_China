"use client";

import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport, type UIMessage } from "ai";
import { useCallback, useEffect, useState } from "react";
import { CHAT_MAX_CHARS } from "@/lib/ai/chat-prompt";
import { cloneStorageKey, parseStored, serializeMessages, toRequestMessages, warmClone } from "@/lib/ai/clone/client";

export const hasText = (m: UIMessage) => m.parts.some((p) => p.type === "text" && p.text.trim());

/**
 * Chat with "<name> (bản AI)". The conversation lives only in this browser: it is read from localStorage after the
 * page mounted (so it never differs from the server render), written after each turn, and every request carries the
 * latest messages as text (the server stores nothing). Storage that fails (private mode, full, blocked) just means
 * the conversation is not remembered; chatting still works.
 */
export function useCloneChat(userId: string) {
  const key = cloneStorageKey(userId);
  const [transport] = useState(
    () =>
      new DefaultChatTransport<UIMessage>({
        api: "/api/clone",
        prepareSendMessagesRequest: ({ messages }) => ({ body: { messages: toRequestMessages(messages) } }),
      }),
  );
  const { messages, setMessages, sendMessage, status, error, stop: stopChat, regenerate, clearError } = useChat<UIMessage>({
    id: `clone-${userId}`,
    transport,
    throttle: 50, // at most one render per 50 ms while an answer streams
  });
  const [restored, setRestored] = useState(false);
  const busy = status === "submitted" || status === "streaming";

  // Wake the route and read the saved conversation, once, after mounting. Done on the next tick and cancelled by the
  // cleanup, so StrictMode's second run of this effect restores only once.
  useEffect(() => {
    warmClone();
    const timer = setTimeout(() => {
      try {
        const saved = parseStored(window.localStorage.getItem(key));
        if (saved.length) setMessages(saved);
      } catch {
        // storage blocked: start empty
      }
      setRestored(true);
    }, 0);
    return () => clearTimeout(timer);
  }, [key, setMessages]);

  // Save when a message is sent (status "submitted") and when a turn ends, not on every streamed chunk.
  // Nothing is written before the saved conversation was read back, so it cannot be wiped by the empty start.
  useEffect(() => {
    if (!restored || status === "streaming") return;
    try {
      const raw = serializeMessages(messages);
      if (raw === "[]") window.localStorage.removeItem(key);
      else window.localStorage.setItem(key, raw);
    } catch {
      // full or blocked: the conversation is just not remembered
    }
  }, [messages, status, restored, key]);

  const send = (text: string) => {
    const t = text.trim();
    if (!t || busy || t.length > CHAT_MAX_CHARS) return false;
    if (error) clearError();
    void sendMessage({ text: t });
    return true;
  };

  // Stable, so memoized message rows do not re-render for it.
  const retry = useCallback(() => {
    if (error) clearError();
    void regenerate();
  }, [error, clearError, regenerate]);

  const stop = () => {
    void stopChat();
  };

  /** Forgets the conversation: here and in this browser's storage. */
  const reset = () => {
    void stopChat();
    setMessages([]);
    if (error) clearError();
    try {
      window.localStorage.removeItem(key);
    } catch {
      // nothing to remove
    }
  };

  const last = messages.at(-1);
  // While the answer has no text yet, the bubble shows that the companion is writing.
  const waiting = busy && (last?.role === "user" || (last?.role === "assistant" && !hasText(last)));

  return { messages, status, busy, waiting, error, restored, send, retry, stop, reset };
}
