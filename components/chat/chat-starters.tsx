"use client";

import { Sparkles } from "lucide-react";
import type { ChatStarter } from "@/lib/ai/tutor/starters";

/** Example questions as chips. Picking one asks it (send) or puts it in the box to finish. */
export function ChatStarters({ starters, onPick, disabled }: { starters: ChatStarter[]; onPick: (s: ChatStarter) => void; disabled?: boolean }) {
  return (
    <ul className="flex flex-wrap gap-2" aria-label="Gợi ý câu hỏi">
      {starters.map((s) => (
        <li key={s.label} className="max-w-full">
          <button
            type="button"
            disabled={disabled}
            onClick={() => onPick(s)}
            className="inline-flex min-h-11 max-w-full items-center gap-2 rounded-full border border-border bg-surface px-4 py-2 text-left text-sm font-medium text-fg shadow-xs transition-colors hover:border-primary hover:bg-primary-soft hover:text-primary-fg disabled:opacity-50"
          >
            <Sparkles className="size-4 shrink-0 text-primary" strokeWidth={2} aria-hidden />
            <span data-check-overflow>{s.label}</span>
          </button>
        </li>
      ))}
    </ul>
  );
}
