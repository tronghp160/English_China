"use client";

import { useState } from "react";

const COLORS = [
  "var(--ink-blue)",
  "var(--sun)",
  "var(--jade)",
  "var(--pink)",
  "var(--sky)",
  "var(--grape)",
  "var(--highlight)",
];

/** One-shot burst of paper confetti over the parent (position: relative). Decorative, ends invisible. */
export function Confetti({ pieces = 36 }: { pieces?: number }) {
  // Random layout is decided once per mount (client only), so it never re-shuffles on re-render.
  const [bits] = useState(() =>
    Array.from({ length: pieces }, (_, i) => ({
      left: Math.random() * 100,
      delay: Math.random() * 0.35,
      duration: 1.6 + Math.random() * 1.2,
      drift: (Math.random() - 0.5) * 160,
      spin: (Math.random() - 0.5) * 900,
      size: 6 + Math.random() * 6,
      round: i % 3 === 0,
      color: COLORS[i % COLORS.length],
    })),
  );
  return (
    <div
      aria-hidden
      className="pointer-events-none absolute inset-x-0 top-0 h-[70vh] overflow-hidden"
    >
      {bits.map((b, i) => (
        <span
          key={i}
          className="confetti-piece absolute top-0 block"
          style={
            {
              left: `${b.left}%`,
              width: b.size,
              height: b.round ? b.size : b.size * 1.6,
              borderRadius: b.round ? "9999px" : "2px",
              background: b.color,
              animationDelay: `${b.delay}s`,
              animationDuration: `${b.duration}s`,
              "--drift": `${b.drift}px`,
              "--spin": `${b.spin}deg`,
            } as React.CSSProperties
          }
        />
      ))}
    </div>
  );
}
