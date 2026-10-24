"use client";

import { Eye, SkipForward } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { cssVar } from "@/components/zh/stroke-order";

type Writer = import("hanzi-writer").default;

/** A character counts as written correctly with at most this many stroke mistakes. */
const MAX_MISTAKES_PER_CHAR = 3;

/**
 * Stroke-by-stroke writing quiz (hanzi-writer quiz mode), one character after
 * another. Wrong strokes are hinted after 2 misses (§10.4 "writing").
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
        strokeColor: cssVar("--ink", "#1E2A4A"),
        outlineColor: cssVar("--rule-strong", "#C5C6DA"),
        highlightColor: cssVar("--ink-violet", "#3B2E8C"),
        drawingColor: cssVar("--ink", "#1E2A4A"),
        drawingWidth: 6,
        onLoadCharDataError: () => !cancelled && setFailed(true),
      });
      writer.current = w;
      await w.quiz({
        showHintAfterMisses: 2,
        markStrokeCorrectAfterMisses: 4,
        onComplete: ({ totalMistakes }) => {
          if (cancelled) return;
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
        <p className="text-ink-soft">
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
                ? "font-hanzi text-2xl text-ink"
                : i === pos
                  ? "font-hanzi text-2xl text-ink-violet"
                  : "font-hanzi text-2xl text-rule-strong"
            }
          >
            {i < pos || disabled ? c : "□"}
          </span>
        ))}
      </div>
      <div
        className="relative touch-none overflow-hidden rounded-sm border-[1.5px] border-seal/55 bg-surface"
        style={{ width: size, height: size }}
      >
        <svg
          aria-hidden
          className="pointer-events-none absolute inset-0 text-seal/30"
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
