import type { LucideIcon } from "lucide-react";
import { IconTile } from "@/components/ui/icon-tile";
import type { Tone } from "@/lib/tone";

export function StatCard({
  icon,
  tone,
  value,
  label,
  hint,
  className = "",
}: {
  icon: LucideIcon;
  tone: Tone;
  value: string | number;
  label: string;
  hint?: string;
  className?: string;
}) {
  return (
    <div
      className={`flex items-center gap-3 rounded-lg bg-surface p-4 shadow-sm dark:border dark:border-border ${className}`}
    >
      <IconTile icon={icon} tone={tone} size={44} />
      <div className="min-w-0">
        <p className="font-display text-2xl leading-none font-extrabold tabular-nums">{value}</p>
        <p className="mt-1 text-sm text-fg-muted">{label}</p>
        {hint && <p className="mt-0.5 text-xs text-fg-subtle">{hint}</p>}
      </div>
    </div>
  );
}

export { StatCard as Stat };
