"use client";

import { Eye, SkipForward } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Burst } from "@/components/fx/burst";
import { Button } from "@/components/ui/button";
import { haptic } from "@/lib/haptics";
import { playSfx } from "@/lib/sfx";
import { cn } from "@/lib/utils";
import { cssVar } from "@/components/zh/stroke-order";

type Writer = import("hanzi-writer").default;

/** A character counts as written correctly with at most this many stroke mistakes. */
const MAX_MISTAKES_PER_CHAR = 3;
/** A stroke is outlined for the writer after this many wrong tries on it. */
const HINT_AFTER_MISSES = 3;

/**
 * Stroke-by-stroke writing quiz (hanzi-writer quiz mode), one character after
 * another. A right stroke flashes the pad green, a wrong one flashes it red and the stroke is outlined after 3 misses
 * (§10.4 "writing", REDESIGN_V3 §8.7); a finished character bursts.
 */
export function WritingPad({
  chars,
  disabled,
  onDone,
}: {
  chars: string[];
  disabled: boolean;
  onDone: (correct: boolean) => void;
}) {
  const box = useRef<HTMLDivElement>(null);
  const writer = useRef<Writer | null>(null);
  const mistakes = useRef(0);
  const [pos, setPos] = useState(0);
  const [failed, setFailed] = useState(false);
  const size = 300; // fits a 360px-wide phone with the page gutter
  const [usedHint, setUsedHint] = useState(false);
  // Counters the pad reacts to: a flash per stroke, a burst per finished character
  const [flash, setFlash] = useState<{ n: number; right: boolean }>({ n: 0, right: true });
  const [burst, setBurst] = useState(0);
  const onDoneRef = useRef(onDone);
  useEffect(() => {
    onDoneRef.current = onDone;
  });

  useEffect(() => {
    let cancelled = false;
    const char = chars[pos];
    if (!char || disabled) return;
    (async () => {
      const { default: HanziWriter } = await import("hanzi-writer");
      if (cancelled || !box.current) return;
      box.current.innerHTML = "";
      const w = HanziWriter.create(box.current, char, {
        width: size,
        height: size,
        padding: 10,
        showCharacter: false,
        showOutline: false,
        strokeColor: cssVar("--fg", "#12131A"),
        outlineColor: cssVar("--border-strong", "#CDD2DF"),
        highlightColor: cssVar("--primary", "#3557F5"),
        drawingColor: cssVar("--fg", "#12131A"),
        drawingWidth: 6,
        onLoadCharDataError: () => !cancelled && setFailed(true),
      });
      writer.current = w;
      await w.quiz({
        showHintAfterMisses: HINT_AFTER_MISSES,
        onCorrectStroke: () => {
          if (cancelled) return;
          setFlash((f) => ({ n: f.n + 1, right: true }));
          playSfx("pop");
          haptic("light");
        },
        onMistake: () => {
          if (cancelled) return;
          setFlash((f) => ({ n: f.n + 1, right: false }));
          playSfx("wrong");
          haptic("error");
        },
        markStrokeCorrectAfterMisses: 4,
        onComplete: ({ totalMistakes }) => {
          if (cancelled) return;
          setBurst((b) => b + 1);
          playSfx("correct");
          mistakes.current += totalMistakes;
          const charOk = totalMistakes <= MAX_MISTAKES_PER_CHAR;
          if (!charOk) mistakes.current += 100; // any failed character fails the word
          setTimeout(() => {
            if (cancelled) return;
            if (pos + 1 < chars.length) setPos(pos + 1);
            else onDoneRef.current(mistakes.current < 100);
          }, 600);
        },
      });
    })();
    return () => {
      cancelled = true;
      writer.current?.cancelQuiz();
      writer.current = null;
    };
  }, [chars, pos, size, disabled]);

  if (failed) {
    return (
      <div className="flex flex-col items-center gap-3 text-center">
        <p className="text-fg-muted">
          Không tải được dữ liệu nét chữ (cần mạng). Bạn có thể bỏ qua câu này.
        </p>
        <Button type="button" variant="outline" onClick={() => onDone(false)}>
          Bỏ qua
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center gap-3">
      <div className="flex gap-1.5" aria-label={`Chữ ${pos + 1} trên ${chars.length}`}>
        {chars.map((c, i) => (
          <span
            key={i}
            lang="zh-CN"
            className={
              i < pos
                ? "font-hanzi text-2xl text-fg"
                : i === pos
                  ? "font-hanzi text-2xl text-primary"
                  : "font-hanzi text-2xl text-border-strong"
            }
          >
            {i < pos || disabled ? c : "□"}
          </span>
        ))}
      </div>
      <div
        className="relative touch-none overflow-hidden rounded-xl border-2 border-border bg-surface"
        style={{ width: size, height: size }}
      >
        {flash.n > 0 && (
          <span
            key={flash.n}
            aria-hidden
            className={cn("pad-flash pointer-events-none absolute inset-0 z-10", flash.right ? "bg-success-soft" : "bg-danger-soft")}
          />
        )}
        <Burst trigger={burst} palette="success" radius={90} className="z-10" />
        <svg
          aria-hidden
          className="pointer-events-none absolute inset-0 text-border-strong"
          width={size}
          height={size}
        >
          <line
            x1="0"
            y1={size / 2}
            x2={size}
            y2={size / 2}
            stroke="currentColor"
            strokeDasharray="6 6"
          />
          <line
            x1={size / 2}
            y1="0"
            x2={size / 2}
            y2={size}
            stroke="currentColor"
            strokeDasharray="6 6"
          />
          <line
            x1="0"
            y1="0"
            x2={size}
            y2={size}
            stroke="currentColor"
            strokeDasharray="6 6"
            opacity="0.6"
          />
          <line
            x1={size}
            y1="0"
            x2="0"
            y2={size}
            stroke="currentColor"
            strokeDasharray="6 6"
            opacity="0.6"
          />
        </svg>
        <div
          ref={box}
          className="relative"
          aria-label="Khung viết: vẽ từng nét bằng ngón tay hoặc chuột"
          role="img"
        />
      </div>
      {!disabled && (
        <div className="flex gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => {
              setUsedHint(true);
              mistakes.current += 2;
              writer.current?.showOutline();
            }}
            disabled={usedHint}
          >
            <Eye aria-hidden />
            Hiện chữ mờ
          </Button>
          <Button type="button" variant="outline" onClick={() => onDone(false)}>
            <SkipForward aria-hidden />
            Bỏ qua
          </Button>
        </div>
      )}
    </div>
  );
}
