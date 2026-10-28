import { STATUS_LABEL, type PresenceStatus } from "@/lib/presence";

export function OnlineDot({
  status,
  withLabel = false,
  className = "",
}: {
  status: PresenceStatus;
  withLabel?: boolean;
  className?: string;
}) {
  const dotColor =
    status === "online"
      ? "bg-success"
      : status === "away"
        ? "bg-c-sun"
        : status === "offline"
          ? "bg-border-strong"
          : "bg-border";

  return (
    <span className={`inline-flex items-center gap-1.5 ${className}`}>
      {/* Strict requirement: zero animation, no pulse */}
      <span className={`inline-block size-2.5 shrink-0 rounded-full ${dotColor}`} />
      <span className={withLabel ? (status === "online" ? "text-xs font-medium text-success-fg" : "text-xs text-fg-muted") : "sr-only"}>
        {STATUS_LABEL[status]}
      </span>
    </span>
  );
}
