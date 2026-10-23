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
import { cn } from "@/lib/utils";

// Each section has its own candy color: `tone` = icon color + wash for its pill/tile,
// `wash` = the active row in the sidebar, `solid` = the filled icon tile and accent bar when active.
type NavItem = { href: string; label: string; icon: LucideIcon; tone: string; wash: string; solid: string };

const PRIMARY: NavItem[] = [
  { href: "/today", label: "Hôm nay", icon: CalendarCheck, tone: "text-ink-blue bg-wash-blue", wash: "bg-wash-blue", solid: "bg-ink-blue" },
  { href: "/decks", label: "Bộ từ", icon: BookOpen, tone: "text-sun-text bg-wash-yellow", wash: "bg-wash-yellow", solid: "bg-sun" },
  { href: "/practice", label: "Luyện tập", icon: PenLine, tone: "text-jade-text bg-wash-jade", wash: "bg-wash-jade", solid: "bg-jade" },
  { href: "/chat", label: "Gia sư", icon: MessageCircleHeart, tone: "text-grape-text bg-wash-grape", wash: "bg-wash-grape", solid: "bg-grape" },
  { href: "/groups", label: "Nhóm", icon: Users, tone: "text-pink-text bg-wash-pink", wash: "bg-wash-pink", solid: "bg-pink" },
];

const SECONDARY: NavItem[] = [
  { href: "/explore", label: "Khám phá", icon: Compass, tone: "text-sky-text bg-wash-sky", wash: "bg-wash-sky", solid: "bg-sky" },
  { href: "/stats", label: "Thống kê", icon: BarChart3, tone: "text-grape-text bg-wash-grape", wash: "bg-wash-grape", solid: "bg-grape" },
  { href: "/settings", label: "Cài đặt", icon: Settings, tone: "text-ink-soft bg-muted", wash: "bg-muted", solid: "bg-ink-soft" },
  { href: "/lien-he", label: "Liên hệ", icon: MessageSquareHeart, tone: "text-pink-text bg-wash-pink", wash: "bg-wash-pink", solid: "bg-pink" },
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
  const { prefs } = useMe();
  const item = ({ href, label, icon: Icon, tone, wash, solid }: NavItem) => {
    const active = isActive(pathname, href);
    return (
      <li key={href}>
        <Link
          href={href}
          aria-current={active ? "page" : undefined}
          className={cn(
            "group relative flex min-h-12 items-center gap-3 rounded-btn py-1.5 pr-2 pl-2.5 text-[0.9375rem] transition-[background-color,color,transform] duration-200",
            active
              ? cn(wash, "font-bold text-ink")
              : "font-medium text-ink-soft hover:translate-x-0.5 hover:bg-muted hover:text-ink",
          )}
        >
          <span
            aria-hidden
            className={cn(
              "absolute top-2.5 bottom-2.5 -left-4 w-1.5 rounded-r-full transition-opacity",
              solid,
              active ? "opacity-100" : "opacity-0",
            )}
          />
          <span
            className={cn(
              "icon-tile size-9 transition-transform duration-200 group-hover:scale-110 group-hover:-rotate-6",
              active ? cn(solid, "text-white shadow-card dark:text-paper") : tone,
            )}
          >
            <Icon className="size-5" strokeWidth={active ? 2.5 : 2} aria-hidden />
          </span>
          {label}
        </Link>
      </li>
    );
  };
  return (
    <aside className="fixed inset-y-0 left-0 z-30 hidden w-60 flex-col overflow-y-auto border-r border-rule bg-linear-to-b from-surface via-surface to-wash-blue px-4 pt-5 pb-4 lg:flex">
      <Link href="/today" className="mb-1 self-start rounded-btn px-1" aria-label="Sổ Từ — Hôm nay">
        <Logo />
      </Link>
      <p className="mb-6 px-1 text-xs text-ink-soft">Sổ từ vựng Anh · Trung của bạn</p>

      <nav aria-label="Điều hướng chính" className="flex flex-col gap-5">
        <div>
          <p className="mb-1.5 px-2.5 text-xs font-bold text-ink-soft">Học</p>
          <ul className="space-y-1">{PRIMARY.map(item)}</ul>
        </div>
        <div>
          <p className="mb-1.5 px-2.5 text-xs font-bold text-ink-soft">Khác</p>
          <ul className="space-y-1">{SECONDARY.map(item)}</ul>
        </div>
      </nav>

      <div className="mt-auto pt-6">
        <div className="relative rounded-card border border-rule bg-surface p-3 pt-2 shadow-card">
          {prefs.mascot ? (
            <div className="flex items-end gap-1">
              <PettablePup mood="happy" name={prefs.mascot_name} size={56} className="-ml-1" />
              <p className="mb-2 text-sm leading-snug text-ink">
                <span className="block text-xs font-bold text-ink-soft">{prefs.mascot_name}</span>
                Học một chút mỗi ngày nha 🐾
              </p>
            </div>
          ) : (
            <p className="py-1 text-sm text-ink">Học một chút mỗi ngày nhé ✨</p>
          )}
          <Link
            href="/review"
            className="btn-3d mt-2 flex min-h-11 items-center justify-center gap-1.5 rounded-btn bg-primary text-sm font-extrabold text-primary-foreground [--edge-color:var(--ink-blue-shade)]"
          >
            <Play className="size-4 fill-current" aria-hidden />
            Ôn ngay
          </Link>
        </div>
      </div>
    </aside>
  );
}
