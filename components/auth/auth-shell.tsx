"use client";

import { ArrowLeft, Flame, Sparkles } from "lucide-react";
import { m } from "motion/react";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { Logo } from "@/components/brand/logo";
import { cn } from "@/lib/utils";
import { AuthBin, AuthBinProvider } from "./auth-bin";

const SLIDES = ["Mỗi ngày ôn đúng những từ sắp quên.", "8 cách luyện, vui như chơi game.", "Học cùng bạn bè, đua bảng xếp hạng."];
const SLIDE_MS = 5000;

/** A white word card on the panel, rotated, floating on its own beat and shifting with the mouse (`depth` = how far). */
function WordCard({
  className,
  rotate,
  depth,
  delay,
  duration,
  children,
}: {
  className: string;
  rotate: number;
  depth: number;
  delay: number;
  duration: number;
  children: React.ReactNode;
}) {
  return (
    <div
      aria-hidden
      className={cn("auth-parallax absolute", className)}
      style={{ rotate: `${rotate}deg`, "--depth": depth } as React.CSSProperties}
    >
      <div className="auth-float" style={{ "--float-delay": `${delay}s`, "--float-dur": `${duration}s` } as React.CSSProperties}>
        {children}
      </div>
    </div>
  );
}

const CARD = "rounded-[18px] bg-surface text-fg shadow-[0_16px_30px_-12px_rgb(10_20_80/0.45)]";

/** The left half on a laptop: blue, with flat circles, drifting word cards, Bin on a rug and a slogan that changes. */
function Panel() {
  const [slide, setSlide] = useState(0);
  const [paused, setPaused] = useState(false);
  const [shift, setShift] = useState({ x: 0, y: 0 });

  useEffect(() => {
    if (paused) return;
    const t = setInterval(() => setSlide((s) => (s + 1) % SLIDES.length), SLIDE_MS);
    return () => clearInterval(t);
  }, [paused]);

  return (
    <section
      aria-hidden
      onPointerEnter={() => setPaused(true)}
      onPointerLeave={() => {
        setPaused(false);
        setShift({ x: 0, y: 0 });
      }}
      onPointerMove={(e) => {
        if (e.pointerType !== "mouse") return;
        const r = e.currentTarget.getBoundingClientRect();
        setShift({ x: ((e.clientX - r.left) / r.width - 0.5) * 2, y: ((e.clientY - r.top) / r.height - 0.5) * 2 });
      }}
      style={{ "--px": shift.x.toFixed(2), "--py": shift.y.toFixed(2) } as React.CSSProperties}
      className="relative hidden min-h-[calc(100dvh-2rem)] flex-col overflow-hidden rounded-[2rem] bg-primary p-10 text-on-primary lg:flex"
    >
      <span className="absolute -top-28 -right-36 size-[26rem] rounded-full bg-primary-lift" />
      <span className="absolute bottom-[15%] -left-28 size-72 rounded-full bg-primary-deep" />
      <span className="absolute top-[18%] left-[24%] size-20 rounded-full bg-primary-lift" />

      <Link href="/" tabIndex={-1} className="relative self-start rounded-md">
        <Logo inverse />
      </Link>

      <WordCard className="top-[14%] left-[8%]" rotate={-6} depth={1.4} delay={0} duration={7}>
        <div className={cn(CARD, "flex flex-col gap-0.5 px-4 py-3")}>
          <span className="text-[1.375rem] leading-tight font-extrabold tracking-[-0.02em]">resilient</span>
          <span className="font-ipa text-[0.8125rem] text-fg-muted">/rɪˈzɪl.i.ənt/</span>
          <span className="text-sm font-semibold text-primary-fg">kiên cường</span>
        </div>
      </WordCard>
      <WordCard className="top-[11%] right-[9%]" rotate={5} depth={1.1} delay={1.2} duration={8}>
        <div className={cn(CARD, "flex flex-col items-center px-4 py-3")}>
          <span lang="zh-CN" className="font-hanzi-sans text-[2.125rem] leading-[1.1] font-bold">
            坚强
          </span>
          <span className="text-sm font-semibold">
            <span className="text-tone-1">jiān</span> <span className="text-tone-2">qiáng</span>
          </span>
        </div>
      </WordCard>
      <WordCard className="top-[42%] left-[10%]" rotate={4} depth={0.7} delay={2.2} duration={9}>
        <span className="inline-flex items-center gap-1.5 rounded-full bg-streak-soft px-3.5 py-2 text-sm font-extrabold text-streak-fg shadow-[0_12px_24px_-10px_rgb(10_20_80/0.4)]">
          <Flame className="size-4 fill-c-sun" />
          Chuỗi 14 ngày
        </span>
      </WordCard>
      <WordCard className="top-[38%] right-[10%]" rotate={-5} depth={1.2} delay={0.7} duration={7.5}>
        <div className={cn(CARD, "flex flex-col px-4 py-2.5")}>
          <span className="text-xl font-extrabold">thank you</span>
          <span className="text-sm font-semibold text-primary-fg">cảm ơn</span>
        </div>
      </WordCard>
      <WordCard className="top-[54%] right-[24%]" rotate={8} depth={0.6} delay={3} duration={8.5}>
        <span className="inline-flex items-center gap-1.5 rounded-full bg-xp-soft px-3.5 py-1.5 text-sm font-extrabold text-xp-fg shadow-[0_12px_24px_-10px_rgb(10_20_80/0.4)]">
          <Sparkles className="size-3.5" />
          +20 XP
        </span>
      </WordCard>

      <div className="relative mt-auto flex items-end justify-between gap-4">
        <div className="flex max-w-[22rem] flex-col gap-3.5">
          <p key={slide} className="animate-in fade-in-0 slide-in-from-bottom-2 font-display text-[2rem] leading-[1.15] duration-500">
            {SLIDES[slide]}
          </p>
          <div className="flex gap-1.5">
            {SLIDES.map((s, i) => (
              <span key={s} className={cn("h-2 rounded-full bg-on-primary transition-[width,opacity] duration-300", i === slide ? "w-[1.375rem]" : "w-2 opacity-45")} />
            ))}
          </div>
        </div>
        <div className="relative -mr-2 -mb-2.5 size-[14.5rem] shrink-0">
          <span className="absolute inset-x-5 bottom-1.5 h-[2.125rem] rounded-full bg-primary-hover" />
          <AuthBin size={232} className="absolute inset-0" bubbleClassName="right-[85%] top-2" />
        </div>
      </div>
    </section>
  );
}

/** On phones: the top band with the logo, little word cards and Bin. It shrinks while the keyboard is open. */
function Band({ compact }: { compact: boolean }) {
  return (
    <section
      aria-hidden
      className={cn(
        "relative shrink-0 overflow-hidden bg-primary text-on-primary transition-[min-height] duration-300 lg:hidden",
        compact ? "min-h-[7.5rem]" : "min-h-[38dvh]",
      )}
    >
      <span className="absolute -top-20 -right-20 size-64 rounded-full bg-primary-lift" />
      <span className="absolute bottom-3 -left-12 size-36 rounded-full bg-primary-deep" />
      <Link href="/" tabIndex={-1} className="absolute top-4 left-5 rounded-md">
        <Logo inverse className="scale-90 origin-left" />
      </Link>
      <div className={cn("transition-opacity duration-200", compact && "opacity-0")}>
        <WordCard className="top-[34%] left-[6%]" rotate={-7} depth={0} delay={0} duration={7}>
          <div className={cn(CARD, "rounded-[14px] px-3 py-2")}>
            <span className="block text-base leading-tight font-extrabold">hello</span>
            <span className="block text-xs font-semibold text-primary-fg">xin chào</span>
          </div>
        </WordCard>
        <WordCard className="top-[24%] right-[6%]" rotate={6} depth={0} delay={1.5} duration={8}>
          <div className={cn(CARD, "rounded-[14px] px-3 py-1.5 text-center")}>
            <span lang="zh-CN" className="block font-hanzi-sans text-2xl leading-[1.1] font-bold">
              坚强
            </span>
            <span className="block text-xs font-semibold">
              <span className="text-tone-1">jiān</span> <span className="text-tone-2">qiáng</span>
            </span>
          </div>
        </WordCard>
        <WordCard className="top-[58%] right-[10%]" rotate={-4} depth={0} delay={2.5} duration={9}>
          <span className="inline-flex rounded-full bg-xp-soft px-2.5 py-1 text-xs font-extrabold text-xp-fg">+20 XP</span>
        </WordCard>
      </div>
      <div className={cn("absolute bottom-0 left-1/2 -translate-x-1/2 transition-[transform] duration-300", compact ? "translate-y-0" : "translate-y-1")}>
        <AuthBin size={compact ? 72 : 140} bubbleClassName="right-[80%]" />
      </div>
    </section>
  );
}

/** The two links Đăng nhập | Đăng ký in one pill track; the white pill slides to the page you are on. */
function Tabs() {
  const pathname = usePathname();
  const next = useSearchParams().get("next");
  const suffix = next ? `?next=${encodeURIComponent(next)}` : "";
  const items = [
    { href: "/login", label: "Đăng nhập" },
    { href: "/signup", label: "Đăng ký" },
  ];
  return (
    <nav aria-label="Chọn trang" className="grid grid-cols-2 rounded-full bg-surface-2 p-1">
      {items.map((it) => {
        const active = pathname === it.href;
        return (
          <Link
            key={it.href}
            href={`${it.href}${suffix}`}
            aria-current={active ? "page" : undefined}
            className={cn(
              "relative grid h-11 place-items-center rounded-full text-[0.9375rem] transition-colors",
              active ? "font-bold text-fg" : "font-semibold text-fg-muted hover:text-fg",
            )}
          >
            {active && (
              <m.span
                layoutId="auth-tab"
                aria-hidden
                className="absolute inset-0 rounded-full bg-surface shadow-sm dark:border dark:border-border"
                transition={{ type: "spring", stiffness: 420, damping: 34 }}
              />
            )}
            <span className="relative">{it.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}

function BackLink() {
  return (
    <Link href="/login" className="-ml-2 inline-flex min-h-11 items-center gap-1.5 rounded-md px-2 text-[0.9375rem] font-semibold text-fg-muted hover:text-fg">
      <ArrowLeft className="size-4" aria-hidden />
      Đăng nhập
    </Link>
  );
}

/** True while the on-screen keyboard takes a good part of the screen (phones). */
function useKeyboardOpen() {
  const [open, setOpen] = useState(false);
  useEffect(() => {
    const vv = window.visualViewport;
    if (!vv) return;
    const onResize = () => setOpen(window.innerHeight - vv.height > 150);
    vv.addEventListener("resize", onResize);
    return () => vv.removeEventListener("resize", onResize);
  }, []);
  return open;
}

function Shell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const tabs = pathname === "/login" || pathname === "/signup";
  const keyboard = useKeyboardOpen();
  return (
    <div className="flex min-h-dvh flex-col bg-primary lg:grid lg:grid-cols-[1.1fr_1fr] lg:gap-4 lg:bg-canvas lg:p-4">
      <Panel />
      <Band compact={keyboard} />
      <main className="relative -mt-6 flex flex-1 flex-col lg:mt-0 lg:items-center lg:justify-center">
        <div className="flex-1 rounded-t-[1.75rem] bg-surface px-5 pt-6 pb-10 lg:w-full lg:max-w-md lg:flex-none lg:rounded-xl lg:p-8 lg:shadow-lg dark:lg:border dark:lg:border-border">
          <div className="mx-auto w-full max-w-md lg:max-w-none">
            {tabs ? (
              <Suspense fallback={<div className="h-[3.25rem] rounded-full bg-surface-2" />}>
                <Tabs />
              </Suspense>
            ) : (
              <BackLink />
            )}
            {children}
          </div>
        </div>
      </main>
    </div>
  );
}

/** The frame of every sign-in page; it stays while you move between them, so Bin and the pill keep their place. */
export function AuthShell({ children }: { children: React.ReactNode }) {
  return (
    <AuthBinProvider>
      <Shell>{children}</Shell>
    </AuthBinProvider>
  );
}
