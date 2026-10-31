"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import { toast } from "sonner";
import { loadTutorThread } from "@/lib/actions/chat";
import type { ChatMessage } from "@/lib/ai/chat-tools";
import { chatUrl } from "@/lib/ai/tutor/chat-url";
import { groupThreadsByDay, type ThreadSummary } from "@/lib/ai/tutor/history";
import { warmTutor } from "@/lib/ai/tutor/warm";
import type { ChatStarter } from "@/lib/ai/tutor/starters";
import type { LangCode } from "@/lib/lang/types";
import { TutorChatFrame } from "./tutor-chat-frame";
import { TutorHistoryList } from "./tutor-history-list";

/** isNew: opened here with a fresh id; the first message creates the thread (/api/chat newThread). */
type Active = { id: string; title: string | null; messages: ChatMessage[]; prompt?: string; isNew?: boolean } | null;

/** Changes the address bar without a Next navigation (same /chat route), so the open chat keeps its state. */
function setUrl(path: string) {
  if (window.location.pathname + window.location.search !== path) window.history.replaceState(null, "", path);
}

/**
 * /chat: the chat window on the left (open straight away), recent conversations and the learner's day on
 * the right (below it on phones). Starting a conversation happens in place; the address follows
 * (/chat?c=<id>, same route) so a reload or a shared link opens the same conversation.
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

  useEffect(() => warmTutor(), []); // the learner opened /chat to ask something

  // Full screen: the chat covers the page. Esc goes back; the page behind does not scroll meanwhile.
  const [expanded, setExpanded] = useState(false);
  useEffect(() => {
    if (!expanded) return;
    const html = document.documentElement;
    html.classList.add("overflow-hidden");
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !e.isComposing) setExpanded(false);
    };
    document.addEventListener("keydown", onKey);
    return () => {
      html.classList.remove("overflow-hidden");
      document.removeEventListener("keydown", onKey);
    };
  }, [expanded]);

  // "Hỏi gia sư" links arrive as /chat?c=<id>&q=…: the question is sent once, so drop it from the address.
  useEffect(() => {
    if (thread && initialPrompt) setUrl(chatUrl(thread.id));
  }, [thread, initialPrompt]);

  // The page got another conversation from the server (a link or back/forward changed ?c=): show it.
  // Compared with the previous prop, not with what is open, so a refresh of the same page changes nothing.
  const [prevPropId, setPrevPropId] = useState(thread?.id ?? null);
  const propId = thread?.id ?? null;
  if (propId !== prevPropId) {
    setPrevPropId(propId);
    if (propId !== (active?.id ?? null)) {
      setActive(thread ? { ...thread, prompt: initialPrompt } : null);
      setFrameKey(thread?.id ?? "new-from-link");
    }
  }

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
    setFrameKey((k) => (k === "new-a" ? "new-b" : "new-a"));
    setUrl(chatUrl());
  };
  const onCreated = ({ id, title, prompt }: { id: string; title: string; prompt: string }) => {
    setCreated((c) => [{ id, title, updated_at: new Date().toISOString() }, ...c]);
    setActive({ id, title, messages: [], prompt, isNew: true });
    setFrameKey(id);
    setUrl(chatUrl(id));
  };
  // Opening a conversation from the list happens in place too (no page change).
  const [opening, setOpening] = useState<string | null>(null);
  const open = async (id: string) => {
    if (id === active?.id || opening) return;
    setOpening(id);
    const t = await loadTutorThread(id).catch(() => null);
    setOpening(null);
    if (!t) {
      toast.error("Không mở được cuộc trò chuyện này.");
      return;
    }
    setActive({ id: t.id, title: t.title, messages: t.messages });
    setFrameKey(t.id);
    setUrl(chatUrl(t.id));
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
        isNew={active?.isNew}
        language={language}
        starters={starters}
        tutorName={tutorName}
        mascot={mascot}
        aiEnabled={aiEnabled}
        displayName={displayName}
        onNewChat={newChat}
        onCreated={onCreated}
        expanded={expanded}
        onToggleExpand={() => setExpanded((x) => !x)}
      />

      <aside className="min-w-0 space-y-6 lg:sticky lg:top-20 lg:max-h-[calc(100dvh-6.5rem)] lg:overflow-y-auto lg:pr-1 lg:pb-1">
        <section aria-labelledby="chat-history" className="space-y-3">
          <h2 id="chat-history" className="text-lg font-bold text-fg">
            Trò chuyện gần đây
          </h2>
          <TutorHistoryList groups={groups} tutorName={tutorName} activeId={opening ?? active?.id} onOpen={open} onDeleted={onDeleted} compact />
        </section>
        {aside}
      </aside>
    </div>
  );
}
