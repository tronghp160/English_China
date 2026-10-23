import type { PupMood } from "@/lib/mascot/lines";
import { cn } from "@/lib/utils";
import { Pup } from "./pup";

/** The puppy with a speech bubble on its right. Works in server and client components. */
export function MascotSay({
  mood,
  name,
  text,
  size = 72,
  className,
}: {
  mood: PupMood;
  name: string;
  text: string;
  size?: number;
  className?: string;
}) {
  return (
    <div className={cn("flex items-end gap-2", className)}>
      <Pup mood={mood} size={size} className={mood === "cheer" ? undefined : "animate-bob"} />
      <div
        className="relative mb-3 min-w-0 animate-pop-in rounded-card border border-rule bg-surface px-4 py-2.5 text-left shadow-card"
      >
        <span
          aria-hidden
          className="absolute bottom-4 -left-1.5 size-3 rotate-45 border-b border-l border-rule bg-surface"
        />
        <span className="block text-xs font-bold text-ink-soft">{name}</span>
        <span className="block font-semibold text-ink">{text}</span>
      </div>
    </div>
  );
}
