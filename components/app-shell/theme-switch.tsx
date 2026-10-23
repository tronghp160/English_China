"use client";

import { Moon, Sun } from "lucide-react";
import { applyThemePreference } from "@/lib/theme";

/** Header button that flips light/dark. Icons switch by CSS, so the server render matches. */
export function ThemeSwitch() {
  return (
    <button
      type="button"
      aria-label="Đổi giao diện sáng / tối"
      title="Đổi giao diện sáng / tối"
      onClick={() =>
        applyThemePreference(document.documentElement.classList.contains("dark") ? "light" : "dark")
      }
      className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-btn border border-rule bg-surface text-ink-soft transition-colors hover:bg-muted hover:text-ink"
    >
      <Moon className="size-5 dark:hidden" aria-hidden />
      <Sun className="hidden size-5 text-sun dark:block" aria-hidden />
    </button>
  );
}
