import { deckTone } from "@/lib/deck-colors";
import { cn } from "@/lib/utils";

/** A group's picture: its first letter on a notebook-cover color chosen from its id. Decorative (the name is beside it). */
export function GroupAvatar({ id, name, className }: { id: string; name: string; className?: string }) {
  const initial = Array.from(name.trim())[0]?.toUpperCase() ?? "?";
  return (
    <span
      aria-hidden
      className={cn("grid size-12 shrink-0 place-items-center rounded-btn font-display text-xl font-semibold text-white", deckTone(id).cover, className)}
    >
      {initial}
    </span>
  );
}
