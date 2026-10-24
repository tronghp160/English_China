"use client";

import { useSyncExternalStore } from "react";
import { cn } from "@/lib/utils";
import { applyThemePreference, readThemePreference, type ThemePreference } from "@/lib/theme";

const OPTIONS: { value: ThemePreference; label: string }[] = [
  { value: "light", label: "Sáng" },
  { value: "dark", label: "Tối" },
  { value: "system", label: "Theo hệ thống" },
];

const listeners = new Set<() => void>();
function subscribe(cb: () => void) {
  listeners.add(cb);
  return () => listeners.delete(cb);
}

/** A tiny notebook page drawn in the colors of one theme (the `.light` / `.dark` classes re-apply that theme's tokens). */
function Page({ theme, className }: { theme: "light" | "dark"; className?: string }) {
  return (
    <span className={cn(theme, "block h-full bg-paper p-1.5", className)}>
      <span className="ruled-paper margin-line block h-full rounded-sm border border-rule bg-surface [--line:0.5rem] [--margin-x:9px]" />
    </span>
  );
}

export function ThemeToggle({ className }: { className?: string }) {
  const current = useSyncExternalStore(subscribe, readThemePreference, () => "system" as const);

  return (
    <div role="radiogroup" aria-label="Giao diện" className={cn("grid grid-cols-3 gap-2", className)}>
      {OPTIONS.map(({ value, label }) => (
        <button
          key={value}
          type="button"
          role="radio"
          aria-checked={current === value}
          onClick={() => {
            applyThemePreference(value);
            listeners.forEach((l) => l());
          }}
          className={cn(
            "flex flex-col gap-2 rounded-btn border p-2 text-left text-sm transition-colors",
            current === value ? "border-ink-violet bg-tint-violet ring-1 ring-ink-violet" : "border-input bg-surface hover:border-ink-soft/50",
          )}
        >
          <span aria-hidden className="block h-14 overflow-hidden rounded-sm border border-rule">
            {value === "system" ? (
              <span className="grid h-full grid-cols-2">
                <Page theme="light" />
                <Page theme="dark" />
              </span>
            ) : (
              <Page theme={value} />
            )}
          </span>
          <span className={cn("px-0.5", current === value ? "font-medium text-ink" : "text-ink-soft")}>{label}</span>
        </button>
      ))}
    </div>
  );
}
