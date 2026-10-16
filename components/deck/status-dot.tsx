import { cn } from "@/lib/utils";

type CardState = "new" | "learning" | "review" | "relearning";

export function statusOf(state: CardState, lapses: number, suspended: boolean) {
  if (suspended) return { key: "suspended", label: "Đang tạm ẩn", cls: "border-2 border-ink-soft bg-transparent" };
  if (lapses >= 3) return { key: "hard", label: "Hay quên", cls: "bg-margin-red" };
  if (state === "review") return { key: "learned", label: "Đã thuộc", cls: "bg-jade" };
  if (state === "learning" || state === "relearning") return { key: "learning", label: "Đang học", cls: "bg-highlight ring-1 ring-tone-2/40" };
  return { key: "new", label: "Mới", cls: "border-2 border-rule bg-surface" };
}

/** Small learning-status dot; the label is available to screen readers and on hover. */
export function StatusDot({
  state,
  lapses,
  suspended,
  withLabel = false,
}: {
  state: CardState;
  lapses: number;
  suspended: boolean;
  withLabel?: boolean;
}) {
  const s = statusOf(state, lapses, suspended);
  return (
    <span className="inline-flex shrink-0 items-center gap-1.5" title={s.label}>
      <span className={cn("size-3 rounded-full", s.cls)} aria-hidden />
      {withLabel ? <span className="text-sm text-ink-soft">{s.label}</span> : <span className="sr-only">{s.label}</span>}
    </span>
  );
}
