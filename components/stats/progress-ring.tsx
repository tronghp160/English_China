import { cn } from "@/lib/utils";

/** Circular progress (0–100) with content in the middle. Decorative: give the parent an accessible label. */
export function ProgressRing({
  value,
  size = 72,
  stroke = 8,
  className,
  trackClassName = "text-wash-blue",
  barClassName = "text-ink-blue",
  children,
}: {
  value: number;
  size?: number;
  stroke?: number;
  className?: string;
  trackClassName?: string;
  barClassName?: string;
  children?: React.ReactNode;
}) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const pct = Math.max(0, Math.min(100, value));
  return (
    <span
      className={cn("relative inline-grid shrink-0 place-items-center", className)}
      style={{ width: size, height: size }}
    >
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        className="-rotate-90"
        aria-hidden
      >
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          strokeWidth={stroke}
          stroke="currentColor"
          className={trackClassName}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          strokeWidth={stroke}
          stroke="currentColor"
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={c * (1 - pct / 100)}
          className={cn("transition-[stroke-dashoffset] duration-700", barClassName)}
        />
      </svg>
      <span className="absolute inset-0 grid place-items-center">{children}</span>
    </span>
  );
}
