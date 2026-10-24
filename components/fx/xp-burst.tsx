"use client";

import { m, useReducedMotion } from "motion/react";
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { cn } from "@/lib/utils";

/** The XP counter of the session bar carries this attribute; the burst flies there. */
export const XP_TARGET_ATTR = "data-xp-counter";
/** Fired on `window` when a burst lands (or at once under reduced motion), so the counter can bump. */
export const XP_ARRIVE_EVENT = "sotu:xp-arrive";

/** Runs `onArrive` each time an XP burst reaches the counter. */
export function useXpArrive(onArrive: () => void) {
  useEffect(() => {
    window.addEventListener(XP_ARRIVE_EVENT, onArrive);
    return () => window.removeEventListener(XP_ARRIVE_EVENT, onArrive);
  }, [onArrive]);
}

type Flight = { id: number; from: { x: number; y: number }; to: { x: number; y: number } | null };

/**
 * A "+1 XP" pill that leaves its parent box (put it in a `relative` element, e.g. the answer button) and flies
 * to the XP counter (REDESIGN_V3 §3.6), 650 ms. Each change of `trigger` sends one. With no counter on the
 * page it floats up and fades; under reduced motion nothing flies and the counter is told straight away.
 */
export function XpBurst({ trigger, amount = 1, className }: { trigger: number; amount?: number; className?: string }) {
  const anchor = useRef<HTMLSpanElement>(null);
  const reduced = useReducedMotion();
  const [flights, setFlights] = useState<Flight[]>([]);
  const seen = useRef(trigger);

  useEffect(() => {
    if (!trigger || trigger === seen.current) return;
    seen.current = trigger;
    const el = anchor.current;
    if (!el) return;
    if (reduced) {
      window.dispatchEvent(new Event(XP_ARRIVE_EVENT));
      return;
    }
    const a = el.getBoundingClientRect();
    const t = document.querySelector(`[${XP_TARGET_ATTR}]`)?.getBoundingClientRect();
    const flight: Flight = {
      id: trigger,
      from: { x: a.left + a.width / 2, y: a.top + a.height / 2 },
      to: t ? { x: t.left + t.width / 2, y: t.top + t.height / 2 } : null,
    };
    const id = requestAnimationFrame(() => setFlights((f) => [...f, flight]));
    return () => cancelAnimationFrame(id);
  }, [trigger, reduced]);

  function land(flight: Flight) {
    setFlights((f) => f.filter((x) => x.id !== flight.id));
    if (flight.to) window.dispatchEvent(new Event(XP_ARRIVE_EVENT));
  }

  return (
    <>
      <span ref={anchor} aria-hidden className={cn("pointer-events-none absolute top-0 right-4 size-0", className)} />
      {flights.length > 0 &&
        createPortal(
          flights.map((f) => (
            <m.span
              key={f.id}
              aria-hidden
              className="pointer-events-none fixed top-0 left-0 z-50 -mt-3 -ml-7 rounded-full bg-xp-fg px-2.5 py-0.5 text-sm font-extrabold text-on-primary shadow-md"
              initial={{ x: f.from.x, y: f.from.y, opacity: 0, scale: 0.8 }}
              animate={
                f.to
                  ? { x: f.to.x, y: f.to.y, opacity: [0, 1, 1, 0], scale: [0.8, 1.1, 1, 0.6] }
                  : { x: f.from.x, y: f.from.y - 36, opacity: [0, 1, 1, 0], scale: [0.8, 1.1, 1, 1] }
              }
              transition={{ duration: 0.65, ease: [0.2, 0.7, 0.3, 1], times: [0, 0.15, 0.8, 1] }}
              onAnimationComplete={() => land(f)}
            >
              +{amount} XP
            </m.span>
          )),
          document.body,
        )}
    </>
  );
}
