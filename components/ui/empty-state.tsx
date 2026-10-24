import { cn } from "@/lib/utils";

export type InkFigureName = "notebook" | "grid" | "people" | "chat" | "check";

/**
 * One-color ink drawings for empty states and the mascot-off fallback (REDESIGN_PLAN §5.7):
 * 96px, 1.5px strokes in --ink-soft. Decorative.
 */
export function InkFigure({ name, size = 96, className }: { name: InkFigureName; size?: number; className?: string }) {
  return (
    <svg
      viewBox="0 0 96 96"
      width={size}
      height={size}
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
      className={cn("shrink-0 text-ink-soft", className)}
    >
      {name === "notebook" && (
        <>
          {/* Open notebook: two pages meeting at the spine, ruled lines, a margin line on the left page */}
          <path d="M9 24c13-5 28-4 39 3 11-7 26-8 39-3v47c-13-4-28-3-39 4-11-7-26-8-39-4z" />
          <path d="M48 27v48" />
          <path d="M22 32v35" stroke="var(--margin)" />
          <path d="M28 38c5-1 11-1 15 1M28 47c5-1 11-1 15 1M28 56c5-1 11-1 15 1" />
          <path d="M56 39c5-2 11-2 17-1M56 48c5-2 11-2 17-1M56 57c5-2 11-2 17-1" />
        </>
      )}
      {name === "grid" && (
        <>
          {/* Empty 田字格 cell */}
          <rect x="18" y="18" width="60" height="60" rx="2" />
          <path d="M48 18v60M18 48h60" strokeDasharray="3 4" />
          <path d="M18 18l60 60M78 18L18 78" strokeDasharray="3 4" opacity=".6" />
          <path d="M40 34c4 8 12 14 22 16" strokeWidth={2} stroke="var(--seal)" opacity=".7" />
        </>
      )}
      {name === "people" && (
        <>
          <circle cx="36" cy="34" r="10" />
          <path d="M16 74c0-12 9-20 20-20s20 8 20 20z" />
          <circle cx="66" cy="38" r="8" />
          <path d="M58 56c10-3 22 3 22 18H62" />
        </>
      )}
      {name === "chat" && (
        <>
          <path d="M14 22h44a4 4 0 0 1 4 4v22a4 4 0 0 1-4 4H34l-12 10V52h-8a4 4 0 0 1-4-4V26a4 4 0 0 1 4-4z" />
          <path d="M24 33h26M24 42h16" />
          <path d="M66 40h12a4 4 0 0 1 4 4v18a4 4 0 0 1-4 4h-4v10L62 66H52" />
        </>
      )}
      {name === "check" && (
        <>
          {/* A page with a tick, like a marked exercise */}
          <path d="M24 12h36l14 14v58H24z" />
          <path d="M60 12v14h14" />
          <path d="M34 40h26M34 52h18M34 64h12" />
          <path d="M52 68l8 8 16-18" stroke="var(--leaf)" strokeWidth={2.25} />
        </>
      )}
    </svg>
  );
}

/** Title + one line + up to two buttons, with an ink drawing (or any `figure`) on top. */
export function EmptyState({
  figure = "notebook",
  title,
  children,
  actions,
  className,
}: {
  /** An `InkFigureName`, or a node such as the mascot when Bin is on. */
  figure?: InkFigureName | React.ReactNode;
  title: string;
  children?: React.ReactNode;
  actions?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-col items-center gap-3 px-4 py-10 text-center", className)}>
      {typeof figure === "string" ? <InkFigure name={figure as InkFigureName} /> : figure}
      <h2 className="text-lg text-ink">{title}</h2>
      {children && <p className="max-w-[44ch] text-sm text-ink-soft">{children}</p>}
      {actions && <div className="mt-1 flex flex-wrap items-center justify-center gap-2">{actions}</div>}
    </div>
  );
}
