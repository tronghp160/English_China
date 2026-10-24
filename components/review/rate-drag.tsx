"use client";

import { m, useMotionValue, useTransform, type MotionValue } from "motion/react";
import { useSyncExternalStore } from "react";
import type { RatingValue } from "@/lib/srs/fsrs";

/** Drag farther than this (px) from the middle and letting go gives the rating of that side. */
const THRESHOLD = 120;

/** Where a rated card flies: forgot to the left, hard down, good to the right, easy up (REDESIGN_V3 §8.1). */
export const FLY: Record<RatingValue, { x: number; y: number; rotate: number }> = {
  1: { x: -460, y: 0, rotate: -12 },
  2: { x: 0, y: 560, rotate: 0 },
  3: { x: 460, y: 0, rotate: 10 },
  4: { x: 0, y: -560, rotate: 8 },
};

const subscribeFine = (cb: () => void) => {
  const mq = window.matchMedia("(pointer: fine)");
  mq.addEventListener("change", cb);
  return () => mq.removeEventListener("change", cb);
};

/** A real mouse or trackpad (not a finger): the only case where the card can be dragged to rate it. */
export function usePointerFine() {
  return useSyncExternalStore(subscribeFine, () => window.matchMedia("(pointer: fine)").matches, () => false);
}

/**
 * Lets a mouse user drag the turned card to rate it: left Quên, right Nhớ, up Dễ, down Khó. The side it leans to
 * lights up with its label; let go past 120 px to rate, otherwise it snaps back. The rating buttons stay (they are
 * what keyboards, touch and tests use).
 */
export function RateDrag({
  enabled,
  onRate,
  children,
}: {
  enabled: boolean;
  onRate: (rating: RatingValue) => void;
  children: React.ReactNode;
}) {
  const fine = usePointerFine();
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const rotate = useTransform(x, [-300, 0, 300], [-10, 0, 10]);
  const left = useTransform(x, [-THRESHOLD, -30, 0], [1, 0, 0]);
  const right = useTransform(x, [0, 30, THRESHOLD], [0, 0, 1]);
  const up = useTransform(y, [-THRESHOLD, -30, 0], [1, 0, 0]);
  const down = useTransform(y, [0, 30, THRESHOLD], [0, 0, 1]);

  return (
    <m.div
      drag={enabled && fine}
      dragSnapToOrigin
      dragMomentum={false}
      dragElastic={0.5}
      style={{ x, y, rotate }}
      onDragEnd={(_, info) => {
        const { x: dx, y: dy } = info.offset;
        if (Math.abs(dx) >= Math.abs(dy)) {
          if (dx <= -THRESHOLD) onRate(1);
          else if (dx >= THRESHOLD) onRate(3);
        } else if (dy <= -THRESHOLD) onRate(4);
        else if (dy >= THRESHOLD) onRate(2);
      }}
      className="relative"
    >
      {children}
      <div aria-hidden className="pointer-events-none absolute inset-0 z-10">
        <m.span style={{ opacity: left }} className="absolute inset-0 rounded-xl bg-rate-again/15" />
        <m.span style={{ opacity: right }} className="absolute inset-0 rounded-xl bg-rate-good/15" />
        <m.span style={{ opacity: up }} className="absolute inset-0 rounded-xl bg-rate-easy/15" />
        <m.span style={{ opacity: down }} className="absolute inset-0 rounded-xl bg-rate-hard/15" />
        <Label style={{ opacity: left }} className="top-4 left-4 bg-rate-again">
          Quên
        </Label>
        <Label style={{ opacity: right }} className="top-4 right-4 bg-rate-good">
          Nhớ
        </Label>
        <Label style={{ opacity: up }} className="top-4 left-1/2 -translate-x-1/2 bg-rate-easy">
          Dễ
        </Label>
        <Label style={{ opacity: down }} className="bottom-4 left-1/2 -translate-x-1/2 bg-rate-hard">
          Khó
        </Label>
      </div>
    </m.div>
  );
}

function Label({ style, className, children }: { style: { opacity: MotionValue<number> }; className: string; children: React.ReactNode }) {
  return (
    <m.span style={style} className={`absolute rounded-full px-3.5 py-1 text-sm font-extrabold text-white shadow-md ${className}`}>
      {children}
    </m.span>
  );
}

/** The card that was just rated, flying off for 320 ms while the next one is already in place. Never mounted under reduced motion. */
export function Flyer({ rating, onDone, children }: { rating: RatingValue; onDone: () => void; children: React.ReactNode }) {
  return (
    <m.div
      aria-hidden
      inert
      className="pointer-events-none absolute inset-x-0 top-0 z-20"
      initial={{ x: 0, y: 0, rotate: 0, opacity: 1 }}
      animate={{ ...FLY[rating], opacity: 0.2 }}
      transition={{ duration: 0.32, ease: "easeIn" }}
      onAnimationComplete={onDone}
    >
      {children}
    </m.div>
  );
}
