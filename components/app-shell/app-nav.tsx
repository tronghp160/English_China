"use client";

import {
  BarChart3,
  BookOpen,
  CalendarCheck,
  Compass,
  MessageCircleHeart,
  MessageSquareHeart,
  PenLine,
  Play,
  Settings,
  Users,
  type LucideIcon,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useMe } from "@/components/app-shell/me-provider";
import { Logo } from "@/components/brand/logo";
import { PettablePup } from "@/components/mascot/pettable-pup";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type NavItem = { href: string; label: string; icon: LucideIcon };

const PRIMARY: NavItem[] = [
  { href: "/today", label: "Hôm nay", icon: CalendarCheck },
  { href: "/decks", label: "Bộ từ", icon: BookOpen },
  { href: "/practice", label: "Luyện tập", icon: PenLine },
  { href: "/chat", label: "Gia sư", icon: MessageCircleHeart },
  { href: "/groups", label: "Nhóm", icon: Users },
];

const SECONDARY: NavItem[] = [
  { href: "/explore", label: "Khám phá", icon: Compass },
  { href: "/stats", label: "Thống kê", icon: BarChart3 },
  { href: "/settings", label: "Cài đặt", icon: Settings },
  { href: "/lien-he", label: "Liên hệ", icon: MessageSquareHeart },
];

function isActive(pathname: string, href: string) {
  if (href === "/decks") return pathname.startsWith("/decks") || pathname.startsWith("/words");
  if (href === "/practice") return pathname.startsWith("/practice") || pathname.startsWith("/hard-words");
  return pathname === href || pathname.startsWith(`${href}/`);
}

/** Bottom tab bar on phones: the active tab gets violet icon, bold label and a short ink bar on top. */
export function BottomNav() {
  const pathname = usePathname();
  return (
    <nav
      aria-label="Điều hướng chính"
      className="fixed inset-x-0 bottom-0 z-40 border-t border-rule bg-surface pb-[env(safe-area-inset-bottom)] shadow-[0_-8px_24px_-18px_rgb(28_27_38/0.25)] lg:hidden"
    >
      <ul className="mx-auto grid max-w-md grid-cols-5 px-1">
        {PRIMARY.map(({ href, label, icon: Icon }) => {
          const active = isActive(pathname, href);
          return (
            <li key={href}>
              <Link
                href={href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "relative flex min-h-16 flex-col items-center justify-center gap-1 text-xs",
                  active ? "font-semibold text-ink" : "font-medium text-ink-soft",
                )}
              >
                {active && <span aria-hidden className="absolute top-0 h-0.5 w-4 rounded-full bg-ink-violet" />}
                <Icon
                  className={cn("size-5", active && "text-ink-violet")}
                  strokeWidth={active ? 2.25 : 1.75}
                  aria-hidden
                />
                {label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

/** Left column on desktop (≥ 1024px): sits on the paper itself, set off by a double red margin line. */
export function SideNav() {
  const pathname = usePathname();
  const { prefs } = useMe();
  const item = ({ href, label, icon: Icon }: NavItem) => {
    const active = isActive(pathname, href);
    return (
      <li key={href}>
        <Link
          href={href}
          aria-current={active ? "page" : undefined}
          className={cn(
            "relative flex h-10 items-center gap-3 rounded-btn border px-3 text-[0.9375rem] transition-colors duration-[var(--dur-fast)]",
            active
              ? "border-rule bg-surface font-semibold text-ink"
              : "border-transparent font-medium text-ink-soft hover:bg-surface-sunk hover:text-ink",
          )}
        >
          {active && <span aria-hidden className="absolute inset-y-2 -left-px w-0.5 rounded-full bg-ink-violet" />}
          <Icon className={cn("size-5", active && "text-ink-violet")} strokeWidth={active ? 2.25 : 1.75} aria-hidden />
          {label}
        </Link>
      </li>
    );
  };
  return (
    <>
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-58 flex-col overflow-y-auto bg-paper px-4 pt-5 pb-4 lg:flex">
        <Link href="/today" className="mb-1 self-start rounded-btn" aria-label="Sổ Từ — Hôm nay">
          <Logo />
        </Link>
        <p className="mb-5 text-xs text-ink-soft">Sổ từ vựng Anh – Trung</p>

        <nav aria-label="Điều hướng chính" className="flex flex-col gap-5">
          <div>
            <p className="mb-1.5 px-3 text-xs font-semibold text-ink-soft">Học</p>
            <ul className="space-y-0.5">{PRIMARY.map(item)}</ul>
          </div>
          <div>
            <p className="mb-1.5 px-3 text-xs font-semibold text-ink-soft">Khác</p>
            <ul className="space-y-0.5">{SECONDARY.map(item)}</ul>
          </div>
        </nav>

        {/* Bin drawn in the margin, one line, and the way into a review */}
        <div className="mt-auto pt-6">
          {prefs.mascot && (
            <div className="flex items-end gap-1.5">
              <PettablePup mood="happy" name={prefs.mascot_name} size={44} className="-ml-1" />
              <p className="mb-1 text-sm leading-snug text-ink">
                <span className="block text-xs text-ink-soft">{prefs.mascot_name}</span>
                Học một chút mỗi ngày nhé.
              </p>
            </div>
          )}
          {!prefs.mascot && <p className="text-sm text-ink-soft">Học một chút mỗi ngày nhé.</p>}
          <Button asChild variant="outline" size="sm" className="mt-2 w-full">
            <Link href="/review">
              <Play className="size-3.5 fill-current" aria-hidden />
              Ôn ngay
            </Link>
          </Button>
        </div>
      </aside>
      {/* The notebook's double margin line */}
      <div aria-hidden className="fixed inset-y-0 left-58 z-30 hidden w-[5px] border-x border-margin lg:block" />
    </>
  );
}
