"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import type { ChatMessage } from "@/lib/ai/chat-tools";
import { groupThreadsByDay, type ThreadSummary } from "@/lib/ai/tutor/history";
import type { ChatStarter } from "@/lib/ai/tutor/starters";
import type { LangCode } from "@/lib/lang/types";
import { TutorChatFrame } from "./tutor-chat-frame";
import { TutorHistoryList } from "./tutor-history-list";

type Active = { id: string; title: string | null; messages: ChatMessage[]; prompt?: string } | null;

/** Changes the address bar without a Next navigation, so the open chat keeps its state. */
function setUrl(path: string) {
  if (window.location.pathname + window.location.search !== path) window.history.replaceState(null, "", path);
}

/**
 * /chat and /chat/[id]: the chat window on the left (open straight away), recent conversations and the
 * learner's day on the right (below it on phones). Starting or switching to a new conversation happens
 * in place; the address follows (/chat/<id>) so a reload or a shared link opens the same conversation.
 */
export function TutorWorkspace({
  thread,
  initialPrompt,
  threads,
  timeZone,
  language,
  starters,
  tutorName,
  mascot,
  aiEnabled,
  displayName,
  aside,
}: {
  thread: { id: string; title: string | null; messages: ChatMessage[] } | null;
  initialPrompt?: string;
  threads: ThreadSummary[];
  timeZone: string;
  language: LangCode;
  starters: ChatStarter[];
  tutorName: string;
  mascot: boolean;
  aiEnabled: boolean;
  displayName: string;
  /** Server-rendered cards for the side column ("Hôm nay của bạn", tips). */
  aside: ReactNode;
}) {
  const [active, setActive] = useState<Active>(thread ? { ...thread, prompt: initialPrompt } : null);
  const [frameKey, setFrameKey] = useState(thread?.id ?? "new");
  const [created, setCreated] = useState<ThreadSummary[]>([]);
  const [deleted, setDeleted] = useState<string[]>([]);

  // "Hỏi gia sư" links arrive as /chat/<id>?q=…: the question is sent once, so drop it from the address.
  useEffect(() => {
    if (thread && initialPrompt) setUrl(`/chat/${thread.id}`);
  }, [thread, initialPrompt]);

  const list = useMemo(() => {
    const seen = new Set<string>();
    return [...created, ...threads].filter((t) => {
      if (seen.has(t.id) || deleted.includes(t.id)) return false;
      seen.add(t.id);
      return true;
    });
  }, [created, threads, deleted]);
  const groups = useMemo(() => groupThreadsByDay(list, new Date(), timeZone), [list, timeZone]);

  const newChat = () => {
    setActive(null);
    setFrameKey(`new-${Date.now()}`);
    setUrl("/chat");
  };
  const onCreated = ({ id, title, prompt }: { id: string; title: string; prompt: string }) => {
    setCreated((c) => [{ id, title, updated_at: new Date().toISOString() }, ...c]);
    setActive({ id, title, messages: [], prompt });
    setFrameKey(id);
    setUrl(`/chat/${id}`);
  };
  const onDeleted = (id: string) => {
    setDeleted((d) => [...d, id]);
    if (active?.id === id) newChat();
  };

  return (
    <div className="grid grid-cols-[minmax(0,1fr)] gap-6 lg:grid-cols-[minmax(0,1fr)_20rem] lg:items-start">
      <TutorChatFrame
        key={frameKey}
        threadId={active?.id ?? null}
        title={active?.title ?? null}
        initialMessages={active?.messages ?? []}
        initialPrompt={active?.prompt}
        language={language}
        starters={starters}
        tutorName={tutorName}
        mascot={mascot}
        aiEnabled={aiEnabled}
        displayName={displayName}
        onNewChat={newChat}
        onCreated={onCreated}
      />

      <aside className="min-w-0 space-y-6 lg:sticky lg:top-20 lg:max-h-[calc(100dvh-6.5rem)] lg:overflow-y-auto lg:pr-1 lg:pb-1">
        <section aria-labelledby="chat-history" className="space-y-3">
          <h2 id="chat-history" className="text-lg font-bold text-fg">
            Trò chuyện gần đây
          </h2>
          <TutorHistoryList groups={groups} tutorName={tutorName} activeId={active?.id} onDeleted={onDeleted} compact />
        </section>
        {aside}
      </aside>
    </div>
  );
}
