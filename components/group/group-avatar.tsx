import { deckColor, deckColorClasses } from "@/lib/deck-colors";
import { cn } from "@/lib/utils";

/** A group's picture: its first letter on a soft color chosen from its id. Decorative (the name is beside it). */
export function GroupAvatar({ id, name, className }: { id: string; name: string; className?: string }) {
  const initial = Array.from(name.trim())[0]?.toUpperCase() ?? "?";
  return (
    <span
      aria-hidden
      className={cn("grid size-12 shrink-0 place-items-center rounded-md text-xl font-extrabold", deckColorClasses(deckColor(id)).soft, deckColorClasses(deckColor(id)).fg, className)}
    >
      {initial}
    </span>
  );
}
