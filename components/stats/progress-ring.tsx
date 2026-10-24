import { cn } from "@/lib/utils";

/**
 * Circular progress (0–100) with content in the middle (REDESIGN_V2 §5.8): thick, round ends, blue,
 * turning green at 100%. The stroke eases to its value when it changes. Decorative: give the parent an accessible label.
 */
export function ProgressRing({
  value,
  size = 72,
  stroke = 10,
  className,
  trackClassName = "text-surface-3",
  barClassName,
  children,
}: {
  value: number;
  size?: number;
  stroke?: number;
  className?: string;
  /** On a colored hero use `text-white/25` */
  trackClassName?: string;
  /** Overrides the default blue / green color */
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
          className={cn(
            "transition-[stroke-dashoffset] duration-[800ms] ease-[var(--ease-out)]",
            barClassName ?? (pct >= 100 ? "text-success" : "text-primary")
          )}
        />
      </svg>
      <span className="absolute inset-0 grid place-items-center">{children}</span>
    </span>
  );
}
