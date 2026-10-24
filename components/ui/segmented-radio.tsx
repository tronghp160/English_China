"use client";

import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Pick one of a few short options as a segmented control (a sunken track, the chosen segment lifted).
 * Real radio inputs underneath, so arrow keys and screen readers work as usual.
 */
export function SegmentedRadio<T extends string | number>({
  name,
  legend,
  value,
  onChange,
  options,
  className,
}: {
  name: string;
  legend: string;
  value: T;
  onChange: (v: T) => void;
  options: { value: T; label: string }[];
  className?: string;
}) {
  return (
    <fieldset className={className}>
      <legend className="mb-2 text-sm font-semibold text-ink">{legend}</legend>
      <div className="inline-flex max-w-full flex-wrap gap-0.5 rounded-chip bg-surface-sunk p-1">
        {options.map((o) => (
          <label
            key={String(o.value)}
            className={cn(
              "inline-flex h-9 cursor-pointer items-center rounded-chip px-3.5 text-sm font-medium whitespace-nowrap transition-colors duration-[var(--dur-fast)] has-focus-visible:outline-2 has-focus-visible:outline-offset-1 has-focus-visible:outline-ink-violet",
              value === o.value ? "bg-surface text-ink shadow-card" : "text-ink-soft hover:text-ink",
            )}
          >
            <input type="radio" name={name} className="sr-only" checked={value === o.value} onChange={() => onChange(o.value)} />
            {o.label}
          </label>
        ))}
      </div>
    </fieldset>
  );
}

/** Pick any number of options (at least one stays on): outlined chips, the chosen ones pale violet with a check. */
export function ChipChoice<T extends string>({
  legend,
  value,
  onChange,
  options,
  className,
}: {
  legend: string;
  value: T[];
  onChange: (v: T[]) => void;
  options: { value: T; label: string }[];
  className?: string;
}) {
  return (
    <fieldset className={className}>
      <legend className="mb-2 text-sm font-semibold text-ink">{legend}</legend>
      <div className="flex flex-wrap gap-2">
        {options.map((o) => {
          const on = value.includes(o.value);
          const last = on && value.length === 1;
          return (
            <label
              key={o.value}
              className={cn(
                "inline-flex h-10 cursor-pointer items-center gap-1.5 rounded-chip border px-3.5 text-sm font-medium transition-colors has-focus-visible:outline-2 has-focus-visible:outline-offset-1 has-focus-visible:outline-ink-violet",
                on ? "border-ink-violet bg-tint-violet text-ink" : "border-input bg-surface text-ink-soft hover:text-ink",
                last && "cursor-default",
              )}
            >
              <input
                type="checkbox"
                className="sr-only"
                checked={on}
                disabled={last}
                onChange={() => onChange(on ? value.filter((v) => v !== o.value) : [...value, o.value])}
              />
              {on && <Check className="size-3.5 text-ink-violet" strokeWidth={2.5} aria-hidden />}
              {o.label}
            </label>
          );
        })}
      </div>
    </fieldset>
  );
}
