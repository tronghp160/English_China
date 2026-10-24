import {
  Brush,
  ClipboardCheck,
  GraduationCap,
  Headphones,
  Keyboard,
  Layers,
  ListChecks,
  Music,
  Puzzle,
  TextCursorInput,
  type LucideIcon,
} from "lucide-react";
import type { PracticeMode } from "@/lib/lang/registry";
import type { Tone } from "@/lib/tone";
import { cn } from "@/lib/utils";

/** One icon and one hue per mode (REDESIGN_V2 §3.3): the single source of mode colors. */
export const MODE_LOOK: Record<PracticeMode, { icon: LucideIcon; tone: Tone }> = {
  learn: { icon: GraduationCap, tone: "blue" },
  test: { icon: ClipboardCheck, tone: "grape" },
  match: { icon: Puzzle, tone: "orange" },
  flashcard: { icon: Layers, tone: "teal" },
  quiz: { icon: ListChecks, tone: "mint" },
  typing: { icon: Keyboard, tone: "pink" },
  listening: { icon: Headphones, tone: "sun" },
  cloze: { icon: TextCursorInput, tone: "coral" },
  writing: { icon: Brush, tone: "blue" },
  tones: { icon: Music, tone: "teal" },
};

/** 48×32 one-color sketches of how each mode works, drawn in the current text color. */
function Sketch({ mode }: { mode: PracticeMode }) {
  switch (mode) {
    case "learn":
      return (
        <>
          <circle cx="24" cy="16" r="11" strokeDasharray="4 3" />
          <path d="M19 16l3.5 3.5L29 12" />
        </>
      );
    case "test":
      return (
        <>
          <rect x="12" y="3" width="24" height="26" rx="2" />
          <rect x="16" y="8" width="4" height="4" />
          <path d="M23 10h9" />
          <rect x="16" y="15" width="4" height="4" />
          <path d="M16.5 17l1.2 1.2 2.3-3M23 17h9" />
          <rect x="16" y="22" width="4" height="4" />
          <path d="M23 24h6" />
        </>
      );
    case "match":
      return (
        <>
          <rect x="4" y="8" width="14" height="16" rx="2" />
          <rect x="30" y="8" width="14" height="16" rx="2" />
          <path d="M18 16h12" />
          <circle cx="18" cy="16" r="1.4" fill="currentColor" />
          <circle cx="30" cy="16" r="1.4" fill="currentColor" />
        </>
      );
    case "flashcard":
      return (
        <>
          <rect x="8" y="9" width="26" height="18" rx="2" />
          <rect x="14" y="5" width="26" height="18" rx="2" fill="var(--surface)" />
          <path d="M20 14h14" />
        </>
      );
    case "quiz":
      return (
        <>
          <circle cx="9" cy="6" r="1.8" fill="currentColor" />
          <path d="M15 6h26" />
          <circle cx="9" cy="13" r="1.8" />
          <path d="M15 13h22" />
          <circle cx="9" cy="20" r="1.8" />
          <path d="M15 20h26" />
          <circle cx="9" cy="27" r="1.8" />
          <path d="M15 27h18" />
        </>
      );
    case "typing":
      return (
        <>
          <path d="M6 22h36" />
          <path d="M10 17h7M21 17h5" />
          <path d="M31 9v12" strokeWidth="2" />
        </>
      );
    case "listening":
      return <path d="M8 14v4M14 10v12M20 6v20M26 10v12M32 12v8M38 14v4" strokeWidth="2" />;
    case "cloze":
      return (
        <>
          <path d="M4 16h10M34 16h10" />
          <rect x="17" y="9" width="14" height="14" rx="1.5" strokeDasharray="3 2.5" />
        </>
      );
    case "writing":
      return (
        <>
          <rect x="13" y="5" width="22" height="22" rx="1.5" />
          <path d="M24 5v22M13 16h22" strokeDasharray="2.5 2.5" />
          <path d="M18 11c4 4 8 7 13 9" strokeWidth="2" />
        </>
      );
    case "tones":
      return (
        <>
          <path d="M4 16h8" />
          <path d="M16 19l8-6" />
          <path d="M28 14l4 5 4-5" />
          <path d="M39 13l5 7" />
        </>
      );
  }
}

export function ModeThumb({ mode, className }: { mode: PracticeMode; className?: string }) {
  return (
    <svg
      viewBox="0 0 48 32"
      width="48"
      height="32"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
      className={cn("shrink-0", className)}
    >
      <Sketch mode={mode} />
    </svg>
  );
}
