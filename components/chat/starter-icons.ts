import {
  BookOpenCheck,
  Languages,
  MessagesSquare,
  PenLine,
  Scale,
  Zap,
  type LucideIcon,
} from "lucide-react";
import type { StarterIcon } from "@/lib/ai/tutor/starters";

export const STARTER_ICONS: Record<StarterIcon, LucideIcon> = {
  practice: MessagesSquare,
  quiz: Zap,
  compare: Scale,
  fix: PenLine,
  explain: BookOpenCheck,
  translate: Languages,
};
