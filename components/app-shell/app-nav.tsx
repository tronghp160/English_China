"use client";

import {
  BarChart3,
  BookOpen,
  Compass,
  HeartHandshake,
  House,
  MessageCircle,
  MessageSquareHeart,
  PenLine,
  Play,
  SlidersHorizontal,
  Users,
  type LucideIcon,
} from "lucide-react";
import { m } from "motion/react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useMe } from "@/components/app-shell/me-provider";
import { Logo } from "@/components/brand/logo";
import { cn } from "@/lib/utils";

type NavItem = { href: string; label: string; icon: LucideIcon };

const PRIMARY: NavItem[] = [
  { href: "/today", label: "Hôm nay", icon: House },
  { href: "/decks", label: "Bộ từ", icon: BookOpen },
  { href: "/practice", label: "Luyện tập", icon: PenLine },
  { href: "/chat", label: "Gia sư", icon: MessageCircle },
  { href: "/groups", label: "Nhóm", icon: Users },
];

/** The phone bar: the review button sits in the middle, "Nhóm" lives in the avatar menu there. */
const PHONE_LEFT: NavItem[] = [PRIMARY[0], PRIMARY[1]];
const PHONE_RIGHT: NavItem[] = [PRIMARY[2], PRIMARY[3]];
/** "Tâm sự" gets a sixth tab on phones, only for accounts that may use it (`cloneName` is null for everybody else). */
const TAM_SU: NavItem = { href: "/tam-su", label: "Tâm sự", icon: HeartHandshake };

const SECONDARY: NavItem[] = [
  { href: "/explore", label: "Khám phá", icon: Compass },
  { href: "/stats", label: "Thống kê", icon: BarChart3 },
  { href: "/settings", label: "Cài đặt", icon: SlidersHorizontal },
  { href: "/lien-he", label: "Liên hệ", icon: MessageSquareHeart },
];

function isActive(pathname: string, href: string) {
  if (href === "/decks") return pathname.startsWith("/decks") || pathname.startsWith("/words");
  if (href === "/practice") return pathname.startsWith("/practice") || pathname.startsWith("/hard-words");
  return pathname === href || pathname.startsWith(`${href}/`);
}

/** Floating pill tab bar on phones (REDESIGN_V2 §6.1): the active tab's icon sits in a pale blue pill. */
export function BottomNav() {
  const pathname = usePathname();
  const { dueCount, cloneName } = useMe();
  // Six tabs are tighter: narrower pills, smaller labels and a smaller review button, so 320px still fits.
  const right = cloneName ? [...PHONE_RIGHT, TAM_SU] : PHONE_RIGHT;
  const compact = right.length > 2;
  const tab = ({ href, label, icon: Icon }: NavItem) => {
    const active = isActive(pathname, href);
    return (
      <li key={href}>
        <Link
          href={href}
          aria-current={active ? "page" : undefined}
          className={cn(
            "flex min-h-14 flex-col items-center justify-center gap-0.5 rounded-full leading-tight whitespace-nowrap",
            compact ? "text-[0.6875rem]" : "text-[0.8125rem]",
            active ? "font-bold text-primary-fg" : "font-medium text-fg-muted",
          )}
        >
          <span className={cn("relative grid h-8 place-items-center rounded-full", compact ? "w-11" : "w-14")}>
            {active && (
              <m.span
                layoutId="bottom-nav-pill"
                aria-hidden
                className="absolute inset-0 rounded-full bg-primary-soft"
                transition={{ type: "spring", stiffness: 420, damping: 34 }}
              />
            )}
            <span key={active ? "on" : "off"} className={cn("relative", active && "animate-pop")}>
              <Icon className="size-5" strokeWidth={active ? 2.3 : 2} aria-hidden />
            </span>
          </span>
          {label}
        </Link>
      </li>
    );
  };
  return (
    <nav
      aria-label="Điều hướng chính"
      className="fixed inset-x-3 bottom-[max(12px,env(safe-area-inset-bottom))] z-40 h-16 rounded-full border border-border/60 bg-surface/85 shadow-lg backdrop-blur-xl lg:hidden"
    >
      <ul className={cn("mx-auto grid h-full max-w-md items-center", compact ? "grid-cols-6 px-1" : "grid-cols-5 px-1.5")}>
        {PHONE_LEFT.map(tab)}
        <li className="relative h-full">
          <Link
            href="/review"
            aria-label={dueCount > 0 ? `Ôn ngay, ${dueCount} từ đến hạn` : "Ôn ngay"}
            className={cn(
              "absolute left-1/2 grid -translate-x-1/2 place-items-center rounded-full bg-primary text-on-primary shadow-primary ring-4 ring-canvas transition-transform duration-[var(--dur-fast)] active:scale-95",
              compact ? "-top-2.5 size-12" : "-top-3.5 size-14",
            )}
          >
            <Play className="size-6 translate-x-px fill-current" aria-hidden />
            {dueCount > 0 && (
              <span
                aria-hidden
                className="absolute -top-1 -right-1.5 grid min-w-6 place-items-center rounded-full bg-c-orange px-1.5 text-xs leading-6 font-extrabold text-black tabular-nums ring-2 ring-canvas"
              >
                {dueCount > 99 ? "99+" : dueCount}
              </span>
            )}
          </Link>
          <span
            aria-hidden
            className={cn(
              "pointer-events-none absolute bottom-1.5 left-1/2 -translate-x-1/2 leading-tight font-bold text-primary-fg",
              compact ? "text-[0.6875rem]" : "text-[0.8125rem]",
            )}
          >
            Ôn
          </span>
        </li>
        {right.map(tab)}
      </ul>
    </nav>
  );
}

/** Left column on desktop (≥ 1024px, 248px): on the canvas itself, the active row is a white pill. */
export function SideNav() {
  const pathname = usePathname();
  const { cloneName } = useMe();
  // "Tâm sự" (the AI version of the owner) is listed only when it is switched on.
  const secondary = cloneName
    ? [SECONDARY[0], SECONDARY[1], { href: "/tam-su", label: "Tâm sự", icon: HeartHandshake }, ...SECONDARY.slice(2)]
    : SECONDARY;
  const item = ({ href, label, icon: Icon }: NavItem) => {
    const active = isActive(pathname, href);
    return (
      <li key={href}>
        <Link
          href={href}
          aria-current={active ? "page" : undefined}
          className={cn(
            "relative flex h-[2.625rem] items-center gap-3 rounded-md px-3 text-[0.9375rem] transition-colors duration-[var(--dur-fast)]",
            active ? "font-semibold text-fg" : "font-medium text-fg-muted hover:bg-surface-2 hover:text-fg",
          )}
        >
          {active && (
            <m.span
              layoutId="side-nav-pill"
              aria-hidden
              className="absolute inset-0 rounded-md bg-surface shadow-sm dark:border dark:border-border"
              transition={{ type: "spring", stiffness: 420, damping: 34 }}
            />
          )}
          <span key={active ? "on" : "off"} className={cn("relative", active && "animate-pop")}>
            <Icon className={cn("size-5", active && "text-primary")} strokeWidth={active ? 2.25 : 2} aria-hidden />
          </span>
          <span className="relative">{label}</span>
        </Link>
      </li>
    );
  };
  return (
    <aside className="fixed inset-y-0 left-0 z-30 hidden w-62 flex-col overflow-y-auto bg-canvas px-4 pt-6 pb-4 lg:flex">
      <Link href="/today" className="mb-6 inline-flex min-h-10 items-center self-start rounded-md px-2" aria-label="Sổ Từ — Hôm nay">
        <Logo />
      </Link>

      <nav aria-label="Điều hướng chính" className="flex flex-col gap-5">
        <div>
          <p className="mb-1 px-3 text-xs font-semibold text-fg-muted">Học</p>
          <ul className="space-y-1">{PRIMARY.map(item)}</ul>
        </div>
        <div>
          <p className="mb-1 px-3 text-xs font-semibold text-fg-muted">Khác</p>
          <ul className="space-y-1">{secondary.map(item)}</ul>
        </div>
      </nav>

    </aside>
  );
}
