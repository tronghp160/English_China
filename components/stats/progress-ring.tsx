import { cn } from "@/lib/utils";

/**
 * Circular progress (0–100) with content in the middle. Ink violet, round ends, turns leaf green at 100%;
 * the stroke is drawn once on mount (`ink-draw`). Decorative: give the parent an accessible label.
 */
export function ProgressRing({
  value,
  size = 72,
  stroke = 6,
  className,
  trackClassName = "text-surface-sunk",
  barClassName,
  children,
}: {
  value: number;
  size?: number;
  stroke?: number;
  className?: string;
  trackClassName?: string;
  /** Overrides the default ink violet / leaf color */
  barClassName?: string;
  children?: React.ReactNode;
}) {
  const r = (size - stroke) / 2;
  const pct = Math.max(0, Math.min(100, value));
  return (
    <span
      className={cn("relative inline-grid shrink-0 place-items-center", className)}
      style={{ width: size, height: size }}
    >
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="-rotate-90" aria-hidden>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" strokeWidth={stroke} stroke="currentColor" className={trackClassName} />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          strokeWidth={stroke}
          stroke="currentColor"
          strokeLinecap="round"
          pathLength={100}
          strokeDasharray={100}
          strokeDashoffset={100 - pct}
          style={{ "--ink-from": 100 } as React.CSSProperties}
          className={cn("animate-ink-draw", barClassName ?? (pct >= 100 ? "text-leaf" : "text-ink-violet"))}
        />
      </svg>
      <span className="absolute inset-0 grid place-items-center">{children}</span>
    </span>
  );
}
