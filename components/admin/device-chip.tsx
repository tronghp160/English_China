import { CircleHelp, Monitor, Smartphone, Tablet } from "lucide-react";
import type { DeviceType } from "@/lib/presence";

export function DeviceChip({
  deviceType,
  browser,
  os,
  className = "",
}: {
  deviceType?: DeviceType | string | null;
  browser?: string | null;
  os?: string | null;
  className?: string;
}) {
  const Icon =
    deviceType === "mobile"
      ? Smartphone
      : deviceType === "tablet"
        ? Tablet
        : deviceType === "desktop"
          ? Monitor
          : CircleHelp;

  const browserText = browser && browser !== "Không rõ" ? browser : null;
  const osText = os && os !== "Không rõ" ? os : null;
  const label = [browserText, osText].filter(Boolean).join(" · ") || "Thiết bị không rõ";

  return (
    <span className={`inline-flex items-center gap-1.5 text-xs text-fg-muted ${className}`}>
      <Icon className="size-3.5 shrink-0" aria-hidden="true" />
      <span>{label}</span>
    </span>
  );
}
