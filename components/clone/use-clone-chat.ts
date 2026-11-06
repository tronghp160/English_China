"use client";

import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport, type UIMessage } from "ai";
import { useCallback, useEffect, useRef, useState } from "react";
import { CHAT_MAX_CHARS } from "@/lib/ai/chat-prompt";
import { clearLegacyCloneStorage, toRequestMessages, warmClone } from "@/lib/ai/clone/client";
import { isCloneForbidden } from "@/lib/ai/clone/forbidden";

export const hasText = (m: UIMessage) => m.parts.some((p) => p.type === "text" && p.text.trim());

/**
 * Chat with "<name> (bản AI)". PRIVACY: the conversation exists only in React state while the page is open. It is
 * written nowhere: not localStorage, sessionStorage, IndexedDB, a cookie or the server. It is gone when the page is
 * left, reloaded or closed, when "Cuộc trò chuyện mới" is pressed, and when the account changes (the chat is keyed by the
 * user id). Every request carries the latest messages as text (the server stores nothing too).
 *
 * - On mount it deletes what an earlier version left in localStorage ("sotu:clone:v1:*").
 * - If an admin switches the access off in the middle of a chat, the next message gets a 404: `locked` turns true and
 *   the page locks the box (nothing can be sent until the page is opened again).
 * - While there is at least one message from the user, the browser's own "leave this page?" prompt guards a reload
 *   or closing the tab. Moving to another page inside the app is not blocked (the page says so under the box).
 */
export function useCloneChat(userId: string) {
  const threadIdRef = useRef<string>("");
  if (!threadIdRef.current) {
    threadIdRef.current = typeof crypto !== "undefined" && typeof crypto.randomUUID === "function" ? crypto.randomUUID() : "";
  }

  const [transport] = useState(
    () =>
      new DefaultChatTransport<UIMessage>({
        api: "/api/clone",
        prepareSendMessagesRequest: ({ messages }) => ({
          body: {
            threadId: threadIdRef.current || undefined,
            messages: toRequestMessages(messages),
          },
        }),
      }),
  );
  const { messages, setMessages, sendMessage, status, error, stop: stopChat, regenerate, clearError } = useChat<UIMessage>({
    id: `clone-${userId}`,
    transport,
    throttle: 50, // at most one render per 50 ms while an answer streams
  });
  const busy = status === "submitted" || status === "streaming";
  const locked = isCloneForbidden(error);

  // On mount: wake the route and delete the conversations an earlier version kept in this browser.
  useEffect(() => {
    warmClone();
    try {
      clearLegacyCloneStorage(window.localStorage);
    } catch {
      // storage blocked: nothing was kept there
    }
  }, []);

  // Leaving the page: stop an answer that is still coming and drop the messages (the latest functions, read at unmount).
  const latest = useRef({ stop: stopChat, setMessages });
  useEffect(() => {
    latest.current = { stop: stopChat, setMessages };
  });
  useEffect(
    () => () => {
      void latest.current.stop();
      latest.current.setMessages([]);
    },
    [],
  );

  // A reload or closing the tab loses the conversation: ask first, but only when there is something to lose.
  const hasUserMessage = messages.some((m) => m.role === "user");
  useEffect(() => {
    if (!hasUserMessage) return;
    const warn = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = ""; // the browser shows its own wording; some need this set
    };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [hasUserMessage]);

  const send = (text: string) => {
    const t = text.trim();
    if (!t || busy || locked || t.length > CHAT_MAX_CHARS) return false;
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

  /** Forgets the conversation at once: stops an answer in progress, empties the screen, and starts a fresh thread. */
  const reset = () => {
    void stopChat();
    setMessages([]);
    threadIdRef.current = typeof crypto !== "undefined" && typeof crypto.randomUUID === "function" ? crypto.randomUUID() : "";
    if (error) clearError();
  };

  const last = messages.at(-1);
  // While the answer has no text yet, the bubble shows that the companion is writing.
  const waiting = busy && (last?.role === "user" || (last?.role === "assistant" && !hasText(last)));

  return { messages, status, busy, waiting, error, locked, send, retry, stop, reset };
}
