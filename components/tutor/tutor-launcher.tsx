"use client";

import { BotMessageSquare, ChevronDown, Sparkles } from "lucide-react";
import { AnimatePresence, m, useReducedMotion } from "motion/react";
import { useState } from "react";
import { Pup } from "@/components/mascot/pup";
import type { PupMood } from "@/lib/mascot/lines";
import { cn } from "@/lib/utils";

export function TutorLauncher({
  open,
  busy,
  unread,
  onToggle,
  mascot = true,
  name = "Bin",
  className,
}: {
  open: boolean;
  busy: boolean;
  unread: boolean;
  onToggle: () => void;
  mascot?: boolean;
  name?: string;
  className?: string;
}) {
  const [isHovered, setIsHovered] = useState(false);
  const prefersReduced = useReducedMotion();

  const mood: PupMood = busy ? "think" : isHovered ? "wink" : "happy";

  const ariaLabel = unread
    ? "Mở gia sư AI (có câu trả lời mới)"
    : open
      ? "Đóng gia sư AI"
      : "Mở gia sư AI";

  return (
    <div className={cn("relative inline-flex items-center", className)}>
      <AnimatePresence>
        {isHovered && !open && (
          <m.span
            initial={prefersReduced ? { opacity: 0 } : { opacity: 0, x: 8 }}
            animate={prefersReduced ? { opacity: 1 } : { opacity: 1, x: 0 }}
            exit={prefersReduced ? { opacity: 0 } : { opacity: 0, x: 8 }}
            transition={{ duration: 0.15 }}
            className="pointer-events-none absolute right-[calc(100%+0.75rem)] top-1/2 hidden -translate-y-1/2 items-center rounded-full border border-border/50 bg-surface px-3.5 text-sm font-semibold text-fg shadow-md whitespace-nowrap lg:flex h-10"
          >
            Hỏi {name}
          </m.span>
        )}
      </AnimatePresence>

      <button
        type="button"
        onClick={onToggle}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        aria-expanded={open}
        aria-controls="tutor-panel"
        aria-label={ariaLabel}
        className={cn(
          "relative flex size-[60px] items-center justify-center rounded-[20px] bg-primary text-on-primary shadow-primary transition-transform duration-150 hover:-translate-y-0.5 active:translate-y-0 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary",
          // Bubble tail pseudo-element
          "before:absolute before:-bottom-1 before:left-2.5 before:size-3.5 before:rotate-45 before:rounded-[3px] before:bg-primary before:content-['']",
        )}
      >
        {mascot ? (
          <span className="grid size-[46px] place-items-center overflow-hidden rounded-full bg-surface ring-2 ring-white/40">
            <Pup mood={mood} size={46} crop="head" />
          </span>
        ) : (
          <BotMessageSquare className="size-[26px] text-on-primary" strokeWidth={2} aria-hidden />
        )}

        {/* AI Sun Badge */}
        <span
          className="absolute -top-1.5 -right-1.5 grid size-6 place-items-center rounded-full border-[3px] border-canvas bg-c-sun text-c-sun-fg shadow-xs"
          aria-hidden
        >
          <Sparkles className="size-3" strokeWidth={2.5} />
        </span>

        {/* ChevronDown when open */}
        {open && (
          <span
            className="absolute -bottom-1 -right-1 grid size-5 place-items-center rounded-full border border-border/40 bg-surface text-primary shadow-xs"
            aria-hidden
          >
            <ChevronDown className="size-3.5" strokeWidth={2.5} />
          </span>
        )}

        {/* Unread dot when closed and has new reply */}
        {!open && unread && (
          <span
            className="absolute -bottom-1 -right-1 size-3.5 rounded-full border-2 border-canvas bg-danger"
            aria-hidden
          />
        )}
      </button>
    </div>
  );
}
