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
  Shuffle,
  type LucideIcon,
} from "lucide-react";
import type { PracticeMode } from "@/lib/lang/registry";

// Icon + candy color per mode (tile text/wash, and the border when selected).
export const MODE_LOOK: Record<PracticeMode, { icon: LucideIcon; tile: string; ring: string }> = {
  learn: { icon: GraduationCap, tile: "bg-wash-jade text-jade-text", ring: "border-jade" },
  test: { icon: ClipboardCheck, tile: "bg-wash-blue text-ink-blue", ring: "border-ink-blue" },
  match: { icon: Shuffle, tile: "bg-wash-yellow text-sun-text", ring: "border-sun" },
  flashcard: { icon: Layers, tile: "bg-wash-red text-danger", ring: "border-margin-red" },
  quiz: { icon: ListChecks, tile: "bg-wash-grape text-grape-text", ring: "border-grape" },
  typing: { icon: Keyboard, tile: "bg-wash-sky text-sky-text", ring: "border-sky" },
  listening: { icon: Headphones, tile: "bg-wash-pink text-pink-text", ring: "border-pink" },
  cloze: { icon: Puzzle, tile: "bg-wash-yellow text-sun-text", ring: "border-sun" },
  writing: { icon: Brush, tile: "bg-wash-jade text-jade-text", ring: "border-jade" },
  tones: { icon: Music, tile: "bg-wash-blue text-ink-blue", ring: "border-ink-blue" },
};
