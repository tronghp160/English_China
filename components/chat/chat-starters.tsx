"use client";

import { IconTile } from "@/components/ui/icon-tile";
import type { ChatStarter } from "@/lib/ai/tutor/starters";
import { STARTER_ICONS } from "./starter-icons";

/** Example questions as vibrant cards with tone icons. */
export function ChatStarters({
  starters,
  onPick,
  disabled,
}: {
  starters: ChatStarter[];
  onPick: (s: ChatStarter) => void;
  disabled?: boolean;
}) {
  return (
    <ul className="grid gap-2 sm:grid-cols-2" aria-label="Gợi ý câu hỏi">
      {starters.map((s) => {
        const Icon = STARTER_ICONS[s.icon];
        return (
          <li key={s.label}>
            <button
              type="button"
              disabled={disabled}
              onClick={() => onPick(s)}
              className="flex min-h-14 w-full items-center gap-3 rounded-lg border border-border/70 bg-surface px-3 py-2.5 text-left shadow-xs transition-shadow hover:shadow-sm disabled:opacity-50 dark:border-border"
            >
              <IconTile icon={Icon} tone={s.tone} size={32} />
              <span className="min-w-0 flex-1 text-sm font-semibold text-fg" data-check-overflow>
                {s.label}
              </span>
            </button>
          </li>
        );
      })}
    </ul>
  );
}
