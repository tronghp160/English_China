import { Check } from "lucide-react";
import type { Sense } from "@/lib/ai/to-word";
import { isPosCode, POS, type PosCode } from "@/lib/pos";
import { cn } from "@/lib/utils";

export function SenseChips({
  senses,
  chosen,
  onToggle,
  onChooseAll,
  className,
  legend,
}: {
  senses: Sense[];
  chosen: number[];
  onToggle: (index: number) => void;
  onChooseAll?: () => void;
  className?: string;
  legend?: string;
}) {
  if (senses.length <= 1) return null;

  return (
    <fieldset className={className}>
      <legend className="mb-1.5 px-1 text-sm text-fg-muted">
        {legend ?? `${senses.length} nghĩa, chạm để chọn nghĩa muốn lưu`}
      </legend>
      <div className="flex flex-wrap gap-2">
        {senses.map((s, i) => {
          const on = chosen.includes(i);
          const pos = (s.pos as string[])
            .filter(isPosCode)
            .map((p: PosCode) => POS[p]?.label ?? p)
            .join(", ");
          return (
            <label
              key={i}
              title={[s.meaning_en, s.examples[0]?.text].filter(Boolean).join(" — ")}
              className={cn(
                "inline-flex min-h-10 max-w-full cursor-pointer items-center gap-1.5 rounded-full border px-3 text-sm transition-colors has-focus-visible:outline-2 has-focus-visible:outline-offset-2 has-focus-visible:outline-primary",
                on ? "border-primary bg-primary text-on-primary" : "border-border-strong bg-surface text-fg-muted hover:text-fg",
              )}
            >
              <input type="checkbox" checked={on} onChange={() => onToggle(i)} className="sr-only" />
              {on && <Check className="size-3.5 shrink-0" strokeWidth={2.5} aria-hidden />}
              <span className="truncate font-medium">{s.meaning_vi}</span>
              {pos && <span className={cn("shrink-0 text-xs", on ? "opacity-80" : "text-fg-muted")}>{pos}</span>}
            </label>
          );
        })}
        {onChooseAll && chosen.length < senses.length && (
          <button
            type="button"
            onClick={onChooseAll}
            className="min-h-10 rounded-full px-2 text-sm font-medium text-primary hover:underline"
          >
            Chọn tất cả
          </button>
        )}
      </div>
    </fieldset>
  );
}
