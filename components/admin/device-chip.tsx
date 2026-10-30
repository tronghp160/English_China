import { CircleHelp, Monitor, Smartphone, Tablet } from "lucide-react";
import type { DeviceType } from "@/lib/presence";

export function DeviceChip({
  deviceType,
  browser,
  os,
  deviceModel,
  className = "",
}: {
  deviceType?: DeviceType | string | null;
  browser?: string | null;
  os?: string | null;
  deviceModel?: string | null;
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

  const modelText = deviceModel && deviceModel !== "Không rõ" ? deviceModel.trim() : null;
  const browserText = browser && browser !== "Không rõ" ? browser : null;
  const osText = os && os !== "Không rõ" ? os : null;

  // If model already carries brand context (e.g. iPhone, iPad, Mac), avoid redundant OS display
  const isApple = Boolean(modelText && /^(iPhone|iPad|MacBook|Mac |iMac)/i.test(modelText));
  const showOs =
    osText &&
    (!modelText || (!isApple && !modelText.toLowerCase().includes(osText.toLowerCase())));

  const secondary = [browserText, showOs ? osText : null].filter(Boolean).join(" · ");
  const tooltip = [modelText, browserText, osText].filter(Boolean).join(" · ");

  return (
    <span
      title={tooltip || undefined}
      className={`inline-flex items-center gap-1.5 text-xs text-fg-muted ${className}`}
    >
      <Icon className="size-3.5 shrink-0" aria-hidden="true" />
      {modelText ? (
        <span>
          <strong className="font-semibold text-fg">{modelText}</strong>
          {secondary && <span> · {secondary}</span>}
        </span>
      ) : (
        <span>{[browserText, osText].filter(Boolean).join(" · ") || "Thiết bị không rõ"}</span>
      )}
    </span>
  );
}
