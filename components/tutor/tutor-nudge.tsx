"use client";

import { X } from "lucide-react";
import { AnimatePresence, m, useReducedMotion } from "motion/react";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

const STORAGE_KEY = "sotu:tutor-nudge:v1";

const STUDY_PAGES = /^\/(review|practice|test)(\/.*)?$/;

export function TutorNudge({
  show = true,
  name = "Bin",
  className,
}: {
  show?: boolean;
  name?: string;
  className?: string;
}) {
  const pathname = usePathname();
  const prefersReduced = useReducedMotion();
  const [dismissed, setDismissed] = useState(false);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!show || dismissed) return;
    if (STUDY_PAGES.test(pathname)) return;

    try {
      if (localStorage.getItem(STORAGE_KEY)) {
        return;
      }
    } catch {
      return;
    }

    // Show after 4s
    const showTimer = setTimeout(() => {
      setVisible(true);
    }, 4000);

    // Auto-hide after 12s (4s initial + 8s visible)
    const hideTimer = setTimeout(() => {
      setVisible(false);
      try {
        localStorage.setItem(STORAGE_KEY, "1");
      } catch {
        // ignore
      }
    }, 12000);

    return () => {
      clearTimeout(showTimer);
      clearTimeout(hideTimer);
    };
  }, [show, dismissed, pathname]);

  const dismiss = () => {
    setVisible(false);
    setDismissed(true);
    try {
      localStorage.setItem(STORAGE_KEY, "1");
    } catch {
      // ignore
    }
  };

  return (
    <AnimatePresence>
      {show && !dismissed && visible && (
        <m.div
          initial={prefersReduced ? { opacity: 0 } : { opacity: 0, y: 6 }}
          animate={prefersReduced ? { opacity: 1 } : { opacity: 1, y: 0 }}
          exit={prefersReduced ? { opacity: 0 } : { opacity: 0, y: 6 }}
          transition={{ duration: 0.2 }}
          className={cn(
            "pointer-events-auto absolute bottom-[calc(100%+0.75rem)] right-0 z-40 flex w-72 items-center gap-2 rounded-2xl border border-border/80 bg-surface p-3 text-sm text-fg shadow-lg",
            className,
          )}
        >
          <p className="min-w-0 flex-1 leading-snug">
            Hỏi <span className="font-semibold">{name}</span> bất cứ điều gì về tiếng Anh, tiếng Trung
          </p>
          <button
            type="button"
            onClick={dismiss}
            aria-label="Đóng gợi ý"
            className="grid size-10 shrink-0 place-items-center rounded-full text-fg-muted hover:bg-surface-2 hover:text-fg focus-visible:outline-2 focus-visible:outline-primary"
          >
            <X className="size-4" aria-hidden />
          </button>
        </m.div>
      )}
    </AnimatePresence>
  );
}
