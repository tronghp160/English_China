"use client";

import { Plus } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

/**
 * Floating action button on phones (above the tab bar), only on the deck list ("Tạo bộ từ") and a deck's page
 * ("Thêm từ"): a round blue button that shows its label while the page scrolls up and shrinks to the icon while it
 * scrolls down, and hides while the on-screen keyboard is open so it never sits on a field. Desktop has no FAB.
 */
export function AddWordFab({ href, label = "Thêm từ" }: { href: string; label?: string }) {
  const [compact, setCompact] = useState(false);
  const [keyboard, setKeyboard] = useState(false);

  useEffect(() => {
    const vv = window.visualViewport;
    if (!vv) return;
    const onResize = () => setKeyboard(window.innerHeight - vv.height > 150);
    vv.addEventListener("resize", onResize);
    return () => vv.removeEventListener("resize", onResize);
  }, []);

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
        "fixed right-4 bottom-[calc(5.5rem+env(safe-area-inset-bottom))] z-30 inline-flex h-14 items-center justify-center gap-2 rounded-full bg-primary text-on-primary shadow-primary transition-[padding,background-color] duration-[var(--dur-base)] ease-[var(--ease-out)] hover:bg-primary-hover lg:hidden",
        compact ? "w-14" : "px-5 font-semibold",
        keyboard && "pointer-events-none translate-y-6 opacity-0",
      )}
    >
      <Plus className="size-5 shrink-0" aria-hidden />
      {!compact && <span className="text-sm">{label}</span>}
    </Link>
  );
}
