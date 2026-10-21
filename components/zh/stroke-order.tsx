"use client";

import { Play } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

type Writer = import("hanzi-writer").default;

export function cssVar(name: string, fallback: string) {
  if (typeof window === "undefined") return fallback;
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim() || fallback;
}

/** Animated stroke order for one Hanzi (hanzi-writer, stroke data from its CDN). */
export function StrokeOrder({ char, size = 112, className }: { char: string; size?: number; className?: string }) {
  const box = useRef<HTMLDivElement>(null);
  const writer = useRef<Writer | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { default: HanziWriter } = await import("hanzi-writer");
      if (cancelled || !box.current) return;
      box.current.innerHTML = "";
      writer.current = HanziWriter.create(box.current, char, {
        width: size,
        height: size,
        padding: 6,
        showOutline: true,
        strokeAnimationSpeed: 1.2,
        delayBetweenStrokes: 250,
        strokeColor: cssVar("--ink", "#1E2A4A"),
        radicalColor: cssVar("--danger", "#C4373D"),
        outlineColor: cssVar("--rule", "#DCE3F0"),
        onLoadCharDataError: () => !cancelled && setFailed(true),
      });
    })();
    return () => {
      cancelled = true;
      writer.current = null;
    };
  }, [char, size]);

  if (failed) {
    return (
      <div
        className={cn("grid place-items-center rounded-btn border border-rule bg-surface font-hanzi text-5xl text-ink", className)}
        style={{ width: size, height: size }}
        lang="zh-CN"
      >
        {char}
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={() => writer.current?.animateCharacter()}
      aria-label={`Xem thứ tự nét chữ ${char}`}
      className={cn("group relative rounded-btn border border-rule bg-surface", className)}
      style={{ width: size, height: size }}
    >
      {/* Rice-paper guide lines (米字格) */}
      <svg aria-hidden className="pointer-events-none absolute inset-0 text-rule" width={size} height={size}>
        <line x1="0" y1={size / 2} x2={size} y2={size / 2} stroke="currentColor" strokeDasharray="4 4" />
        <line x1={size / 2} y1="0" x2={size / 2} y2={size} stroke="currentColor" strokeDasharray="4 4" />
      </svg>
      <div ref={box} className="relative" />
      <span className="absolute right-1 bottom-1 grid size-6 place-items-center rounded-full bg-wash-blue text-ink-blue opacity-80 group-hover:opacity-100">
        <Play className="size-3" aria-hidden />
      </span>
    </button>
  );
}
