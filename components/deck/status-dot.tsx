import { cn } from "@/lib/utils";

type CardState = "new" | "learning" | "review" | "relearning";
type StatusKey = "new" | "learning" | "learned" | "hard" | "suspended";

export function statusOf(state: CardState, lapses: number, suspended: boolean): { key: StatusKey; label: string } {
  if (suspended) return { key: "suspended", label: "Đang tạm ẩn" };
  if (lapses >= 3) return { key: "hard", label: "Hay quên" };
  if (state === "review") return { key: "learned", label: "Đã thuộc" };
  if (state === "learning" || state === "relearning") return { key: "learning", label: "Đang học" };
  return { key: "new", label: "Mới" };
}

/** Learning status as a small drawn dot: empty ring = new, half = learning, full = learned, slash = hidden. */
function Dot({ status, className }: { status: StatusKey; className?: string }) {
  return (
    <svg viewBox="0 0 16 16" width="14" height="14" aria-hidden className={cn("shrink-0", className)}>
      {status === "new" && <circle cx="8" cy="8" r="6" fill="none" stroke="var(--border-strong)" strokeWidth="1.75" />}
      {status === "learning" && (
        <>
          <circle cx="8" cy="8" r="6" fill="none" stroke="var(--streak)" strokeWidth="1.75" />
          <path d="M8 2a6 6 0 0 0 0 12z" fill="var(--streak)" />
        </>
      )}
      {status === "learned" && <circle cx="8" cy="8" r="6.9" fill="var(--success)" />}
      {status === "hard" && <circle cx="8" cy="8" r="6.9" fill="var(--danger)" />}
      {status === "suspended" && (
        <>
          <circle cx="8" cy="8" r="6" fill="none" stroke="var(--fg-subtle)" strokeWidth="1.75" />
          <path d="M3.8 12.2l8.4-8.4" stroke="var(--fg-subtle)" strokeWidth="1.75" strokeLinecap="round" />
        </>
      )}
    </svg>
  );
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
      <Dot status={s.key} />
      {withLabel ? <span className="text-sm text-fg-muted">{s.label}</span> : <span className="sr-only">{s.label}</span>}
    </span>
  );
}

/** Legend under a word table: what each dot means. */
export function StatusLegend({ className }: { className?: string }) {
  const items: StatusKey[] = ["new", "learning", "learned", "hard", "suspended"];
  const labels: Record<StatusKey, string> = { new: "Mới", learning: "Đang học", learned: "Đã thuộc", hard: "Hay quên", suspended: "Tạm ẩn" };
  return (
    <ul className={cn("flex flex-wrap gap-x-4 gap-y-1 text-xs text-fg-muted", className)} aria-label="Chú giải trạng thái">
      {items.map((k) => (
        <li key={k} className="inline-flex items-center gap-1.5">
          <Dot status={k} />
          {labels[k]}
        </li>
      ))}
    </ul>
  );
}
