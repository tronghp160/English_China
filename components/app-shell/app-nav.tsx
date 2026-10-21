"use client";

import {
  BarChart3,
  BookOpen,
  CalendarCheck,
  Compass,
  MessageCircleHeart,
  PenLine,
  Settings,
  Users,
  type LucideIcon,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Logo } from "@/components/brand/logo";
import { cn } from "@/lib/utils";

// Each section has its own candy color: text color for the icon + wash for its pill/tile.
type NavItem = { href: string; label: string; icon: LucideIcon; tone: string };

const PRIMARY: NavItem[] = [
  { href: "/today", label: "Hôm nay", icon: CalendarCheck, tone: "text-ink-blue bg-wash-blue" },
  { href: "/decks", label: "Bộ từ", icon: BookOpen, tone: "text-sun-text bg-wash-yellow" },
  { href: "/practice", label: "Luyện tập", icon: PenLine, tone: "text-jade-text bg-wash-jade" },
  { href: "/chat", label: "Gia sư", icon: MessageCircleHeart, tone: "text-grape-text bg-wash-grape" },
  { href: "/groups", label: "Nhóm", icon: Users, tone: "text-pink-text bg-wash-pink" },
];

const SECONDARY: NavItem[] = [
  { href: "/explore", label: "Khám phá", icon: Compass, tone: "text-sky-text bg-wash-sky" },
  { href: "/stats", label: "Thống kê", icon: BarChart3, tone: "text-grape-text bg-wash-grape" },
  { href: "/settings", label: "Cài đặt", icon: Settings, tone: "text-ink-soft bg-muted" },
];

function isActive(pathname: string, href: string) {
  if (href === "/decks") return pathname.startsWith("/decks") || pathname.startsWith("/words");
  if (href === "/practice") return pathname.startsWith("/practice") || pathname.startsWith("/hard-words");
  return pathname === href || pathname.startsWith(`${href}/`);
}

/** Bottom tab bar on phones. */
export function BottomNav() {
  const pathname = usePathname();
  return (
    <nav
      aria-label="Điều hướng chính"
      className="fixed inset-x-0 bottom-0 z-40 border-t border-rule bg-surface/95 pb-[env(safe-area-inset-bottom)] shadow-[0_-8px_24px_-16px_rgb(88_72_232/0.25)] backdrop-blur lg:hidden"
    >
      <ul className="mx-auto grid max-w-md grid-cols-5 px-1">
        {PRIMARY.map(({ href, label, icon: Icon, tone }) => {
          const active = isActive(pathname, href);
          return (
            <li key={href}>
              <Link
                href={href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex min-h-16 flex-col items-center justify-center gap-0.5 text-xs",
                  active ? "font-bold text-ink" : "font-medium text-ink-soft",
                )}
              >
                <span
                  className={cn(
                    "grid h-8 w-12 place-items-center rounded-full transition-colors",
                    active && cn(tone, "animate-pop-in"),
                  )}
                >
                  <Icon className="size-[22px]" strokeWidth={active ? 2.5 : 1.9} aria-hidden />
                </span>
                {label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

/** Fixed left sidebar on desktop (≥ 1024px). */
export function SideNav() {
  const pathname = usePathname();
  const item = ({ href, label, icon: Icon, tone }: NavItem) => {
    const active = isActive(pathname, href);
    return (
      <li key={href}>
        <Link
          href={href}
          aria-current={active ? "page" : undefined}
          className={cn(
            "flex min-h-12 items-center gap-3 rounded-btn px-2 text-[0.9375rem] transition-colors",
            active ? "bg-muted font-bold text-ink" : "font-medium text-ink-soft hover:bg-muted hover:text-ink",
          )}
        >
          <span className={cn("icon-tile size-9", tone)}>
            <Icon className="size-5" strokeWidth={active ? 2.5 : 2} aria-hidden />
          </span>
          {label}
        </Link>
      </li>
    );
  };
  return (
    <aside className="fixed inset-y-0 left-0 z-30 hidden w-60 flex-col border-r border-rule bg-surface px-4 py-5 lg:flex">
      <Link href="/today" className="mb-8 self-start rounded-btn px-1" aria-label="Sổ Từ — Hôm nay">
        <Logo />
      </Link>
      <nav aria-label="Điều hướng chính" className="flex flex-1 flex-col gap-6">
        <ul className="space-y-1">{PRIMARY.map(item)}</ul>
        <ul className="space-y-1 border-t border-rule pt-6">{SECONDARY.map(item)}</ul>
      </nav>
    </aside>
  );
}
