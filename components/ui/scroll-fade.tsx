"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

/**
 * A row that scrolls sideways when its chips do not fit (REDESIGN_V3 §6.3): snaps to the chips and fades the edge
 * where more is waiting, so nothing looks cut off by accident. The fade only shows when there is more to see.
 */
export function ScrollFade({ children, className }: { children: React.ReactNode; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const [edges, setEdges] = useState({ left: false, right: false });

  const measure = useCallback(() => {
    const el = ref.current;
    if (!el) return;
    const left = el.scrollLeft > 4;
    const right = el.scrollLeft + el.clientWidth < el.scrollWidth - 4;
    setEdges((e) => (e.left === left && e.right === right ? e : { left, right }));
  }, []);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, [measure]);

  const mask = `linear-gradient(to right, ${edges.left ? "transparent, black 28px" : "black, black"}, ${
    edges.right ? "black calc(100% - 28px), transparent" : "black, black"
  })`;

  return (
    <div
      ref={ref}
      onScroll={measure}
      style={edges.left || edges.right ? { maskImage: mask, WebkitMaskImage: mask } : undefined}
      className={cn("flex snap-x snap-proximity gap-2 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden", className)}
    >
      {children}
    </div>
  );
}
