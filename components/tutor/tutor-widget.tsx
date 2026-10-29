"use client";

import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { useOptionalMe } from "@/components/app-shell/me-provider";
import { useKeyboardOpen } from "@/lib/use-keyboard-open";
import { useMediaQuery } from "@/lib/use-media-query";
import { cn } from "@/lib/utils";
import { TutorLauncher } from "./tutor-launcher";
import { TutorNudge } from "./tutor-nudge";
import { TutorPanel } from "./tutor-panel";

/** Pages with the phone FAB in the same corner: the launcher moves up above it. */
const FAB_PAGES = /^\/decks(\/[^/]+)?$/;

export function TutorWidget({ aiEnabled = true }: { aiEnabled?: boolean }) {
  const me = useOptionalMe();
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [busy, setBusy] = useState(false);
  const [unread, setUnread] = useState(false);
  const launcherRef = useRef<HTMLDivElement>(null);

  const hidden = pathname === "/chat" || pathname.startsWith("/chat/");
  const keyboard = useKeyboardOpen();
  const isPhone = useMediaQuery("(max-width: 639px)");

  // Close panel if navigated to the dedicated /chat pages
  useEffect(() => {
    if (hidden && open) {
      const timer = setTimeout(() => {
        setOpen(false);
      }, 0);
      return () => clearTimeout(timer);
    }
  }, [hidden, open]);

  const toggle = () => {
    if (!mounted) setMounted(true);
    setOpen((prev) => {
      const next = !prev;
      if (next) setUnread(false);
      return next;
    });
  };

  const handleClose = () => {
    setOpen(false);
    // Return focus to launcher button
    const btn = launcherRef.current?.querySelector("button");
    btn?.focus();
  };

  const handleAnswerEnd = () => {
    if (!open) {
      setUnread(true);
    }
  };

  if (!me || hidden) return null;

  const lifted = FAB_PAGES.test(pathname);

  return (
    <>
      {mounted && (
        <TutorPanel
          open={open}
          onClose={handleClose}
          onBusy={setBusy}
          onAnswerEnd={handleAnswerEnd}
          userId={me.userId}
          displayName={me.displayName}
          mascot={me.prefs.mascot}
          tutorName={me.prefs.mascot_name}
          dueCount={me.dueCount}
          studyLangs={me.studyLangs}
          aiEnabled={aiEnabled}
        />
      )}
      {!(open && isPhone) && !keyboard && (
        <div
          ref={launcherRef}
          className={cn(
            "fixed right-4 z-40 lg:right-6 lg:bottom-6",
            lifted
              ? "bottom-[calc(10rem+env(safe-area-inset-bottom))]"
              : "bottom-[calc(6rem+env(safe-area-inset-bottom))]",
          )}
        >
          <TutorLauncher
            open={open}
            busy={busy}
            unread={unread}
            onToggle={toggle}
            mascot={me.prefs.mascot}
            name={me.prefs.mascot_name}
          />
          <TutorNudge show={!open} name={me.prefs.mascot_name} />
        </div>
      )}
    </>
  );
}
