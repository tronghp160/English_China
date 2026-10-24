import type { PracticeMode } from "@/lib/lang/registry";
import { cn } from "@/lib/utils";

/**
 * A small picture for each of the four ways to study a deck (REDESIGN_V3 §10): the road of Learn, the sheet of
 * Test, the tiles of Match and the stacked cards of Flashcard. Flat shapes in the hue of the mode; classes are
 * written out whole so Tailwind can see them.
 */
export function ModeArt({ mode, className }: { mode: PracticeMode; className?: string }) {
  return (
    <svg viewBox="0 0 120 72" fill="none" aria-hidden className={cn("block h-auto w-full", className)}>
      {mode === "learn" && (
        <>
          <path d="M16 54C40 54 36 22 60 22S80 50 104 18" className="stroke-c-blue/40" strokeWidth="5" strokeLinecap="round" strokeDasharray="0.1 11" />
          <circle cx="16" cy="54" r="9" className="fill-success" />
          <path d="M12 54l3 3 6-6" className="stroke-white" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" />
          <circle cx="60" cy="22" r="12" className="fill-c-blue" />
          <path d="M57 17l9 5-9 5z" className="fill-white" />
          <circle cx="104" cy="18" r="9" className="fill-c-sun" />
          <path d="M100 18h8M104 14v8" className="stroke-c-sun-fg" strokeWidth="2" strokeLinecap="round" />
        </>
      )}
      {mode === "test" && (
        <>
          <rect x="30" y="6" width="60" height="60" rx="8" className="fill-surface stroke-c-grape" strokeWidth="2.5" />
          <rect x="39" y="16" width="9" height="9" rx="2.5" className="fill-c-grape-soft stroke-c-grape" strokeWidth="1.8" />
          <path d="M54 20.5h26" className="stroke-c-grape/50" strokeWidth="3" strokeLinecap="round" />
          <rect x="39" y="31" width="9" height="9" rx="2.5" className="fill-success" />
          <path d="M41.5 35.5l2 2 3.5-4" className="stroke-white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M54 35.5h20" className="stroke-c-grape/50" strokeWidth="3" strokeLinecap="round" />
          <rect x="39" y="46" width="9" height="9" rx="2.5" className="fill-c-grape-soft stroke-c-grape" strokeWidth="1.8" />
          <path d="M54 50.5h24" className="stroke-c-grape/50" strokeWidth="3" strokeLinecap="round" />
          <circle cx="92" cy="14" r="11" className="fill-c-grape" />
          <path d="M87.5 14l3 3 6-6.5" className="stroke-white" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
        </>
      )}
      {mode === "match" && (
        <>
          <rect x="8" y="12" width="36" height="22" rx="7" className="fill-c-orange-soft stroke-c-orange" strokeWidth="2.2" />
          <rect x="76" y="12" width="36" height="22" rx="7" className="fill-success/15 stroke-success" strokeWidth="2.2" />
          <path d="M44 23h32" className="stroke-c-orange" strokeWidth="2.2" strokeLinecap="round" strokeDasharray="1 6" />
          <rect x="8" y="42" width="36" height="22" rx="7" className="fill-none stroke-border-strong" strokeWidth="2" strokeDasharray="4 4" />
          <rect x="76" y="42" width="36" height="22" rx="7" className="fill-surface stroke-c-orange" strokeWidth="2.2" />
          <path d="M18 23h16M86 23h16" className="stroke-c-orange" strokeWidth="3" strokeLinecap="round" />
          <circle cx="60" cy="53" r="7" className="fill-c-orange" />
          <path d="M57 53l2.2 2.2 3.8-4.2" className="stroke-white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </>
      )}
      {mode === "flashcard" && (
        <>
          <rect x="24" y="16" width="62" height="42" rx="9" className="fill-c-teal-soft stroke-c-teal" strokeWidth="2" transform="rotate(-7 55 37)" />
          <rect x="34" y="12" width="62" height="42" rx="9" className="fill-surface stroke-c-teal" strokeWidth="2.4" />
          <path d="M46 28h38M46 38h24" className="stroke-c-teal" strokeWidth="3" strokeLinecap="round" />
          <path d="M92 56c8-1 14-7 14-15" className="stroke-c-teal" strokeWidth="2.6" strokeLinecap="round" />
          <path d="M102 44l4-4 4 4" className="stroke-c-teal" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" />
        </>
      )}
    </svg>
  );
}
