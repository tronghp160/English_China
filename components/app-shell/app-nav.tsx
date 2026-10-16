"use client";

import {
  BarChart3,
  BookOpen,
  CalendarCheck,
  Compass,
  PenLine,
  Settings,
  Users,
  type LucideIcon,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Logo } from "@/components/brand/logo";
import { cn } from "@/lib/utils";

type NavItem = { href: string; label: string; icon: LucideIcon };

const PRIMARY: NavItem[] = [
  { href: "/today", label: "Hôm nay", icon: CalendarCheck },
  { href: "/decks", label: "Bộ từ", icon: BookOpen },
  { href: "/practice", label: "Luyện tập", icon: PenLine },
  { href: "/groups", label: "Nhóm", icon: Users },
];

const SECONDARY: NavItem[] = [
  { href: "/explore", label: "Khám phá", icon: Compass },
  { href: "/stats", label: "Thống kê", icon: BarChart3 },
  { href: "/settings", label: "Cài đặt", icon: Settings },
];

function isActive(pathname: string, href: string) {
  if (href === "/decks") return pathname.startsWith("/decks") || pathname.startsWith("/words");
  return pathname === href || pathname.startsWith(`${href}/`);
}

/** Bottom tab bar on phones. */
export function BottomNav() {
  const pathname = usePathname();
  return (
    <nav
      aria-label="Điều hướng chính"
      className="fixed inset-x-0 bottom-0 z-40 border-t border-rule bg-surface/95 pb-[env(safe-area-inset-bottom)] backdrop-blur lg:hidden"
    >
      <ul className="mx-auto grid max-w-md grid-cols-4">
        {PRIMARY.map(({ href, label, icon: Icon }) => {
          const active = isActive(pathname, href);
          return (
            <li key={href}>
              <Link
                href={href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex min-h-16 flex-col items-center justify-center gap-1 text-xs",
                  active ? "font-medium text-ink-blue" : "text-ink-soft",
                )}
              >
                <Icon className="size-6" strokeWidth={active ? 2.25 : 1.75} aria-hidden />
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
  const item = ({ href, label, icon: Icon }: NavItem) => {
    const active = isActive(pathname, href);
    return (
      <li key={href}>
        <Link
          href={href}
          aria-current={active ? "page" : undefined}
          className={cn(
            "flex min-h-11 items-center gap-3 rounded-[10px] px-3 text-[0.9375rem] transition-colors",
            active ? "bg-wash-blue font-medium text-ink" : "text-ink-soft hover:bg-muted hover:text-ink",
          )}
        >
          <Icon className={cn("size-5", active && "text-ink-blue")} aria-hidden />
          {label}
        </Link>
      </li>
    );
  };
  return (
    <aside className="fixed inset-y-0 left-0 z-30 hidden w-60 flex-col border-r border-rule bg-surface px-4 py-5 lg:flex">
      <Link href="/today" className="mb-8 self-start rounded-[10px] px-1" aria-label="Sổ Từ — Hôm nay">
        <Logo />
      </Link>
      <nav aria-label="Điều hướng chính" className="flex flex-1 flex-col gap-6">
        <ul className="space-y-1">{PRIMARY.map(item)}</ul>
        <ul className="space-y-1 border-t border-rule pt-6">{SECONDARY.map(item)}</ul>
      </nav>
    </aside>
  );
}
