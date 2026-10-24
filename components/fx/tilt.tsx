"use client";

import { useRef } from "react";
import { cn } from "@/lib/utils";

/**
 * Tips its box toward the mouse, up to `max` degrees (REDESIGN_V3 §6.1): a hint of depth on deck cards. Only a real
 * mouse does this (touch and pen do not), and not for people who asked for reduced motion.
 */
export function Tilt({ children, className, max = 4 }: { children: React.ReactNode; className?: string; max?: number }) {
  const ref = useRef<HTMLDivElement>(null);
  const raf = useRef(0);

  function move(e: React.PointerEvent<HTMLDivElement>) {
    if (e.pointerType !== "mouse" || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const el = ref.current;
    if (!el) return;
    const { clientX, clientY } = e;
    cancelAnimationFrame(raf.current);
    raf.current = requestAnimationFrame(() => {
      const r = el.getBoundingClientRect();
      const px = (clientX - r.left) / r.width - 0.5;
      const py = (clientY - r.top) / r.height - 0.5;
      el.style.transform = `perspective(800px) rotateX(${(-py * max * 2).toFixed(2)}deg) rotateY(${(px * max * 2).toFixed(2)}deg)`;
    });
  }

  function leave() {
    cancelAnimationFrame(raf.current);
    if (ref.current) ref.current.style.transform = "";
  }

  return (
    <div ref={ref} onPointerMove={move} onPointerLeave={leave} className={cn("h-full transition-transform duration-150 ease-out", className)}>
      {children}
    </div>
  );
}
