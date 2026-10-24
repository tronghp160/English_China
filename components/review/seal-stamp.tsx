"use client";

import { useId } from "react";
import { cn } from "@/lib/utils";

/**
 * A red teacher's seal: the one celebration of the app (REDESIGN_PLAN §5.2).
 * Two lines (`text`, optional `sub` such as the date), tilted -8deg, lands once with `stamp-in`.
 * `size` is the side in px; the mini variant (28) shows `text` only. Reduced motion: it just appears.
 */
export function SealStamp({
  text,
  sub,
  size = 96,
  animate = true,
  className,
}: {
  text: string;
  sub?: string;
  size?: number;
  animate?: boolean;
  className?: string;
}) {
  const id = useId();
  const mini = size <= 40;
  return (
    <span
      role="img"
      aria-label={sub ? `${text}, ${sub}` : text}
      className={cn("relative inline-grid shrink-0 place-items-center", animate && "animate-stamp-in", className)}
      style={{ width: size, height: size, transform: "rotate(-8deg)" }}
    >
      {/* Rough edge, like ink on paper */}
      <svg width="0" height="0" aria-hidden className="absolute">
        <filter id={id} x="-5%" y="-5%" width="110%" height="110%">
          <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" seed="3" result="n" />
          <feDisplacementMap in="SourceGraphic" in2="n" scale="1.6" />
        </filter>
      </svg>
      <span className="absolute inset-0 rounded-sm bg-seal text-on-seal" style={{ filter: `url(#${id})` }}>
        <span className="absolute inset-[3px] rounded-xs border border-on-seal/70" />
        <span
          className={cn(
            "absolute inset-0 grid place-content-center text-center leading-tight font-bold",
            mini ? "text-[0.6875rem]" : "text-base",
          )}
        >
          <span>{text}</span>
          {sub && !mini && <span className="text-xs font-medium tabular-nums opacity-90">{sub}</span>}
        </span>
      </span>
    </span>
  );
}
