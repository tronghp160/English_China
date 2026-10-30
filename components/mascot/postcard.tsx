import type { JSX } from "react";
import { placeById } from "@/lib/bin/places";
import { TONE_CLASSES } from "@/lib/tone";
import { cn } from "@/lib/utils";
import { Landmark } from "./landmarks";

/**
 * Clean postcard component for trips and album (PLAN-bin-3.md §1.7.c).
 * Tone background, landmark vector illustration, place name, date and paw stamp.
 */
export function Postcard({
  placeId,
  day,
  word,
  size = "md",
  className,
}: {
  placeId: string;
  day?: string;
  word?: string | null;
  size?: "sm" | "md";
  className?: string;
}): JSX.Element {
  const place = placeById(placeId);
  const tone = place?.tone ?? "blue";
  const toneClass = TONE_CLASSES[tone];

  // Format YYYY-MM-DD into dd/MM
  const formattedDate = day
    ? (() => {
        const parts = day.split("-");
        if (parts.length === 3) return `${parts[2]}/${parts[1]}`;
        return day;
      })()
    : "";

  const isSm = size === "sm";

  return (
    <div
      className={cn(
        "relative flex select-none overflow-hidden rounded-[18px] border-2 border-border/80 shadow-xs transition-transform",
        toneClass.soft,
        isSm ? "h-[104px] p-2.5" : "h-[150px] p-4 sm:h-[160px] sm:p-5",
        className,
      )}
    >
      {/* Left side: landmark drawing */}
      <div className={cn("flex items-center justify-center", isSm ? "w-[72px]" : "w-[110px] sm:w-[120px]")}>
        <div
          className={cn(
            "grid place-items-center rounded-xl bg-surface/70 p-1.5 shadow-2xs backdrop-blur-xs",
            isSm ? "size-14" : "size-20 sm:size-24",
          )}
        >
          <Landmark id={placeId} className={isSm ? "size-11" : "size-16 sm:size-18"} />
        </div>
      </div>

      {/* Right side: details & postal stamp */}
      <div className="relative flex flex-1 flex-col justify-between pl-3">
        <div className="flex items-start justify-between">
          <div className="min-w-0 pr-1">
            <h3
              className={cn(
                "truncate font-extrabold tracking-tight text-fg",
                isSm ? "text-xs" : "text-base sm:text-lg",
              )}
            >
              {place?.name ?? placeId}
            </h3>
            <p className={cn("truncate text-fg-muted", isSm ? "text-[0.625rem]" : "text-xs")}>
              {place?.landmark ?? ""}
            </p>
          </div>

          {/* Postal stamp with dog paw */}
          <div
            className={cn(
              "grid shrink-0 place-items-center rounded-full border-2 border-dashed border-border-strong bg-surface/50 text-fg-muted",
              isSm ? "size-7" : "size-9 sm:size-10",
            )}
            aria-hidden
          >
            <svg
              viewBox="0 0 24 24"
              width={isSm ? 14 : 18}
              height={isSm ? 14 : 18}
              fill="currentColor"
            >
              <ellipse cx="12" cy="15" rx="4" ry="3.5" />
              <circle cx="7.5" cy="9.5" r="1.8" />
              <circle cx="11" cy="7.5" r="1.8" />
              <circle cx="14.5" cy="7.5" r="1.8" />
              <circle cx="17.5" cy="9.5" r="1.8" />
            </svg>
          </div>
        </div>

        <div className="flex items-end justify-between">
          {word ? (
            <span
              className={cn(
                "inline-flex max-w-[120px] truncate rounded-md bg-surface/80 px-1.5 py-0.5 font-bold text-fg-muted shadow-2xs",
                isSm ? "text-[0.625rem]" : "text-xs",
              )}
            >
              {word}
            </span>
          ) : (
            <span />
          )}

          {formattedDate && (
            <span
              className={cn(
                "font-mono font-bold text-fg-muted tabular-nums",
                isSm ? "text-[0.625rem]" : "text-xs",
              )}
            >
              {formattedDate}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
