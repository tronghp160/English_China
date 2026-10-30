"use client";

import { ChevronRight, MessageCircle } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { DeleteChatButton } from "@/components/chat/delete-chat-button";
import { Button } from "@/components/ui/button";
import { IconTile } from "@/components/ui/icon-tile";
import type { ThreadGroup } from "@/lib/ai/tutor/history";
import { formatAgo } from "@/lib/format";
import { toneFor } from "@/lib/tone";
import { cn } from "@/lib/utils";
import { chatUrl } from "@/lib/ai/tutor/chat-url";

function sliceGroups(groups: ThreadGroup[], limit: number): ThreadGroup[] {
  let budget = limit;
  const result: ThreadGroup[] = [];
  for (const g of groups) {
    if (budget <= 0) break;
    const count = Math.min(g.threads.length, budget);
    result.push({
      ...g,
      threads: g.threads.slice(0, count),
    });
    budget -= count;
  }
  return result;
}

export function TutorHistoryList({
  groups,
  tutorName = "Bin",
  activeId,
  onDeleted,
  onOpen,
  compact = false,
}: {
  groups: ThreadGroup[];
  tutorName?: string;
  /** The conversation open in the chat frame: highlighted, not a link to itself. */
  activeId?: string | null;
  onDeleted?: (threadId: string) => void;
  /** Open a conversation in place instead of following the link (the link still works in a new tab). */
  onOpen?: (threadId: string) => void;
  /** Narrow side column: smaller rows, no arrow. */
  compact?: boolean;
}) {
  const [expanded, setExpanded] = useState(false);

  const totalCount = groups.reduce((acc, g) => acc + g.threads.length, 0);

  if (totalCount === 0) {
    return (
      <p className="text-sm text-fg-muted">
        Chưa có cuộc trò chuyện nào. Hỏi {tutorName} câu đầu tiên nhé.
      </p>
    );
  }

  const visibleGroups = expanded ? groups : sliceGroups(groups, 8);
  const remaining = totalCount - 8;

  return (
    <div className="space-y-6">
      {visibleGroups.map((g) => (
        <div key={g.key} className="space-y-2">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-fg-muted">
            {g.label}
          </h3>
          <ul className="space-y-2">
            {g.threads.map((t) => {
              const title = t.title ?? "Cuộc trò chuyện mới";
              const tone = toneFor(t.id);
              const active = t.id === activeId;
              return (
                <li
                  key={t.id}
                  className={cn(
                    "flex items-center gap-1 rounded-lg border pr-1 shadow-xs transition-colors dark:border-border",
                    active ? "border-primary/40 bg-primary-soft" : "border-border/60 bg-surface hover:bg-surface-2",
                  )}
                >
                  <Link
                    href={chatUrl(t.id)}
                    aria-current={active ? "page" : undefined}
                    onClick={(e) => {
                      if (!onOpen || e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return;
                      e.preventDefault();
                      onOpen(t.id);
                    }}
                    className={cn("flex min-w-0 flex-1 items-center gap-3 px-3", compact ? "min-h-12 py-2" : "min-h-14 py-2.5")}
                  >
                    <IconTile icon={MessageCircle} tone={tone} size={32} />
                    <span className="min-w-0 flex-1">
                      <span className={cn("block truncate font-medium", active ? "text-primary-fg" : "text-fg", compact && "text-sm")}>
                        {title}
                      </span>
                      {compact && <span className="block text-xs text-fg-muted">{formatAgo(t.updated_at)}</span>}
                    </span>
                    {!compact && (
                      <>
                        <span className="shrink-0 text-xs text-fg-muted">{formatAgo(t.updated_at)}</span>
                        <ChevronRight className="size-4 shrink-0 text-fg-subtle" aria-hidden />
                      </>
                    )}
                  </Link>
                  <DeleteChatButton threadId={t.id} title={title} onDeleted={onDeleted} />
                </li>
              );
            })}
          </ul>
        </div>
      ))}

      {totalCount > 8 && (
        <div className="pt-1">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => setExpanded((prev) => !prev)}
            className="w-full text-fg-muted hover:text-fg"
          >
            {expanded
              ? "Thu gọn"
              : `Xem thêm ${remaining} cuộc trò chuyện`}
          </Button>
        </div>
      )}
    </div>
  );
}
