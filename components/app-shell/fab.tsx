"use client";

import { Plus } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

/**
 * Floating "Thêm từ" button on phones (above the tab bar): a round ink-violet button that shows its label
 * while the page scrolls up and shrinks to the icon while it scrolls down. Desktop has no FAB:
 * the deck page carries its own "Thêm từ" action.
 */
export function AddWordFab({ href, label = "Thêm từ" }: { href: string; label?: string }) {
  const [compact, setCompact] = useState(false);

  useEffect(() => {
    let last = window.scrollY;
    const onScroll = () => {
      const y = window.scrollY;
      if (Math.abs(y - last) < 8) return;
      setCompact(y > last && y > 80);
      last = y;
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <Link
      href={href}
      aria-label={label}
      className={cn(
        "fixed right-4 bottom-[calc(5rem+env(safe-area-inset-bottom))] z-30 inline-flex h-14 items-center justify-center gap-2 rounded-chip bg-primary text-primary-foreground shadow-lift transition-[padding,background-color] duration-[var(--dur-base)] ease-[var(--ease-out)] hover:bg-ink-violet-hover lg:hidden",
        compact ? "w-14" : "px-5 font-semibold",
      )}
    >
      <Plus className="size-5 shrink-0" aria-hidden />
      {!compact && <span className="text-sm">{label}</span>}
    </Link>
  );
}
