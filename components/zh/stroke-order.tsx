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
        strokeColor: cssVar("--fg", "#1E2A4A"),
        radicalColor: cssVar("--zh", "#FF5C4D"),
        outlineColor: cssVar("--border-strong", "#C5C6DA"),
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
        className={cn("grid place-items-center rounded-lg border-2 border-border bg-surface font-hanzi text-5xl text-fg", className)}
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
      className={cn("group relative rounded-lg border-2 border-border bg-surface", className)}
      style={{ width: size, height: size }}
    >
      {/* 田字格 guide lines: dashed cross and diagonals in the border color */}
      <svg aria-hidden className="pointer-events-none absolute inset-0 text-border" width={size} height={size}>
        <line x1="0" y1={size / 2} x2={size} y2={size / 2} stroke="currentColor" strokeDasharray="4 4" />
        <line x1={size / 2} y1="0" x2={size / 2} y2={size} stroke="currentColor" strokeDasharray="4 4" />
        <line x1="0" y1="0" x2={size} y2={size} stroke="currentColor" strokeDasharray="4 4" opacity="0.6" />
        <line x1={size} y1="0" x2="0" y2={size} stroke="currentColor" strokeDasharray="4 4" opacity="0.6" />
      </svg>
      <div ref={box} className="relative" />
      <span className="absolute right-1 bottom-1 grid size-6 place-items-center rounded-full bg-primary-soft text-primary opacity-80 group-hover:opacity-100">
        <Play className="size-3" aria-hidden />
      </span>
    </button>
  );
}
