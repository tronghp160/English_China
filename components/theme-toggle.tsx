"use client";

import { Monitor, Moon, Sun } from "lucide-react";
import { useSyncExternalStore } from "react";
import { cn } from "@/lib/utils";
import { applyThemePreference, readThemePreference, type ThemePreference } from "@/lib/theme";

const OPTIONS: { value: ThemePreference; label: string; icon: typeof Sun }[] = [
  { value: "light", label: "Sáng", icon: Sun },
  { value: "dark", label: "Tối", icon: Moon },
  { value: "system", label: "Theo máy", icon: Monitor },
];

const listeners = new Set<() => void>();
function subscribe(cb: () => void) {
  listeners.add(cb);
  return () => listeners.delete(cb);
}

export function ThemeToggle({ className }: { className?: string }) {
  const current = useSyncExternalStore(subscribe, readThemePreference, () => "system" as const);

  return (
    <div
      role="radiogroup"
      aria-label="Giao diện"
      className={cn("inline-flex rounded-btn border border-rule bg-surface p-1", className)}
    >
      {OPTIONS.map(({ value, label, icon: Icon }) => (
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
            "inline-flex min-h-11 items-center gap-1.5 rounded-[8px] px-3 text-sm text-ink-soft transition-colors",
            current === value && "bg-wash-blue font-medium text-ink",
          )}
        >
          <Icon className="size-4" aria-hidden />
          {label}
        </button>
      ))}
    </div>
  );
}
