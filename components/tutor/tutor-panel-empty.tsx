"use client";

import { CalendarCheck, ChevronRight, MessageSquare } from "lucide-react";
import Link from "next/link";
import { Pup } from "@/components/mascot/pup";
import { Button } from "@/components/ui/button";
import { IconTile } from "@/components/ui/icon-tile";
import { chatStarters } from "@/lib/ai/tutor/starters";
import type { LangCode } from "@/lib/lang/types";

export function TutorPanelEmpty({
  onPickStarter,
  mascot = true,
  tutorName = "Bin",
  displayName,
  dueCount = 0,
  studyLangs,
  onClose,
}: {
  onPickStarter: (text: string) => void;
  mascot?: boolean;
  tutorName?: string;
  displayName: string;
  dueCount?: number;
  studyLangs: LangCode[];
  onClose: () => void;
}) {
  const starters = chatStarters(studyLangs);

  return (
    <div className="flex-1 space-y-4 overflow-y-auto overscroll-contain p-4">
      {/* Greeting Bubble */}
      <div className="flex items-start gap-2.5">
        {mascot ? (
          <Pup mood="happy" size={32} className="mt-1" />
        ) : (
          <span className="size-8 shrink-0" aria-hidden />
        )}
        <div className="rounded-2xl rounded-tl-sm bg-surface-2 px-3.5 py-2.5 text-sm text-fg">
          Chào <span className="font-semibold">{displayName}</span>! Mình là {tutorName}. Bạn hỏi
          gì về tiếng Anh, tiếng Trung cũng được: nghĩa từ, sửa câu, luyện nói…
        </div>
      </div>

      {/* Today Due Card */}
      {dueCount > 0 && (
        <div className="flex items-center justify-between gap-3 rounded-xl bg-c-sun-soft p-3 text-c-sun-fg shadow-xs">
          <div className="flex items-center gap-2.5 min-w-0">
            <IconTile icon={CalendarCheck} tone="sun" size={32} />
            <p className="text-sm font-medium truncate">
              <span className="font-bold tabular-nums">{dueCount} từ</span> đến hạn ôn hôm nay
            </p>
          </div>
          <Button
            type="button"
            variant="soft"
            tone="sun"
            size="sm"
            onClick={() =>
              onPickStarter("Kiểm tra nhanh mình 5 từ đến hạn ôn nhé, hỏi từng câu một.")
            }
            className="shrink-0 font-semibold"
          >
            Đố mình 5 từ
          </Button>
        </div>
      )}

      {/* Starters */}
      <div className="space-y-2">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-fg-muted">Thử hỏi</h3>
        <div className="space-y-1.5">
          {starters.map((s, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => onPickStarter(s.text)}
              className="flex w-full min-h-11 items-center gap-3 rounded-xl border border-border/60 bg-surface px-3 py-2 text-left text-sm font-semibold text-fg shadow-xs transition-colors hover:border-primary/40 hover:bg-surface-2 active:bg-surface-2 focus-visible:outline-2 focus-visible:outline-primary"
            >
              <IconTile icon={MessageSquare} tone="blue" size={32} />
              <span className="flex-1 min-w-0 leading-tight">{s.label}</span>
              <ChevronRight className="size-4 text-fg-muted shrink-0" aria-hidden />
            </button>
          ))}
        </div>
      </div>

      {/* History Link */}
      <div className="pt-2 text-center">
        <Link
          href="/chat"
          onClick={onClose}
          className="inline-flex min-h-10 items-center text-sm font-medium text-primary-fg hover:underline"
        >
          Xem lịch sử trò chuyện →
        </Link>
      </div>
    </div>
  );
}
