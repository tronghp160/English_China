"use client";

import { Moon, Sun } from "lucide-react";
import { applyThemePreference } from "@/lib/theme";

/**
 * Header button that flips light/dark. The icon is chosen by CSS (`dark:`), so the server render matches;
 * the one that appears turns in over 200ms (a response to the tap).
 */
export function ThemeSwitch() {
  return (
    <button
      type="button"
      aria-label="Đổi giao diện sáng / tối"
      title="Đổi giao diện sáng / tối"
      onClick={() =>
        applyThemePreference(document.documentElement.classList.contains("dark") ? "light" : "dark")
      }
      className="inline-flex size-11 items-center justify-center rounded-full text-fg-muted transition-colors hover:bg-surface-2 hover:text-fg"
    >
      <Moon className="animate-in fade-in-0 spin-in-[-30deg] size-[1.125rem] duration-200 dark:hidden" strokeWidth={1.75} aria-hidden />
      <Sun className="animate-in fade-in-0 spin-in-[30deg] hidden size-[1.125rem] duration-200 dark:block" strokeWidth={1.75} aria-hidden />
    </button>
  );
}
