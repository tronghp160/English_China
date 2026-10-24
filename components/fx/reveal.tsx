import { cn } from "@/lib/utils";

/**
 * Children fade up one after another when the block first shows (50 ms apart, REDESIGN_V3 §3.6). Pure CSS
 * (`.reveal` in globals.css), so it works in server components and never hides content before hydration.
 */
export function Reveal({ className, children }: { className?: string; children: React.ReactNode }) {
  return <div className={cn("reveal", className)}>{children}</div>;
}
