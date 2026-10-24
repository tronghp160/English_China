import { BookOpen, CircleCheck, MessageCircle, SearchX, Users } from "lucide-react";
import type { LucideIcon } from "lucide-react";

import { IconTile } from "@/components/ui/icon-tile";
import { TONE_CLASSES, type Tone } from "@/lib/tone";
import { cn } from "@/lib/utils";

export type FigureName = "notebook" | "grid" | "people" | "chat" | "check";

const FIGURES: Record<FigureName, { icon: LucideIcon; tone: Tone }> = {
  notebook: { icon: BookOpen, tone: "blue" },
  grid: { icon: SearchX, tone: "orange" },
  people: { icon: Users, tone: "grape" },
  chat: { icon: MessageCircle, tone: "teal" },
  check: { icon: CircleCheck, tone: "mint" },
};

/** The picture of an empty state (and the mascot-off fallback of Bin): a big tinted icon tile. Decorative. */
export function FigureTile({ name, size = 72, className }: { name: FigureName; size?: 48 | 72; className?: string }) {
  const f = FIGURES[name];
  return <IconTile icon={f.icon} tone={f.tone} size={size} solid className={cn("self-center", className)} />;
}

/** Title + one line + up to two buttons, with a tile (or any `figure`, such as the mascot) on top, on a pale card. */
export function EmptyState({
  figure = "notebook",
  title,
  children,
  actions,
  className,
}: {
  /** A `FigureName`, or a node such as the mascot when Bin is on. */
  figure?: FigureName | React.ReactNode;
  title: string;
  children?: React.ReactNode;
  actions?: React.ReactNode;
  className?: string;
}) {
  const tone = typeof figure === "string" ? FIGURES[figure as FigureName].tone : "blue";
  return (
    <div className={cn("flex flex-col items-center gap-3 rounded-xl px-4 py-10 text-center", TONE_CLASSES[tone].soft, className)}>
      {typeof figure === "string" ? <FigureTile name={figure as FigureName} /> : figure}
      <h2 className="text-lg font-bold text-fg">{title}</h2>
      {children && <p className="max-w-[44ch] text-sm text-fg-muted">{children}</p>}
      {actions && <div className="mt-1 flex flex-wrap items-center justify-center gap-2">{actions}</div>}
    </div>
  );
}
