"use client";

import { m, useReducedMotion } from "motion/react";
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { cn } from "@/lib/utils";

/** The XP counter of the session bar carries this attribute; the burst flies there. */
export const XP_TARGET_ATTR = "data-xp-counter";
/** Fired on `window` when a burst lands (or at once under reduced motion), so the counter can bump. */
export const XP_ARRIVE_EVENT = "sotu:xp-arrive";

/** The same for bones: the bone chip carries the attribute, the burst announces itself with the event. */
export const BONE_TARGET_ATTR = "data-bone-counter";
export const BONE_ARRIVE_EVENT = "sotu:bone-arrive";

/** Runs `onArrive` each time a burst reaches its counter (XP by default, or pass BONE_ARRIVE_EVENT). */
export function useXpArrive(onArrive: () => void, event: string = XP_ARRIVE_EVENT) {
  useEffect(() => {
    window.addEventListener(event, onArrive);
    return () => window.removeEventListener(event, onArrive);
  }, [onArrive, event]);
}

type Flight = { id: number; from: { x: number; y: number }; to: { x: number; y: number } | null };

/**
 * A "+1 XP" pill that leaves its parent box (put it in a `relative` element, e.g. the answer button) and flies
 * to the XP counter (REDESIGN_V3 §3.6), 650 ms. Each change of `trigger` sends one. With no counter on the
 * page it floats up and fades; under reduced motion nothing flies and the counter is told straight away.
 */
export function XpBurst({
  trigger,
  amount = 1,
  unit = "XP",
  target = XP_TARGET_ATTR,
  arriveEvent = XP_ARRIVE_EVENT,
  className,
}: {
  trigger: number;
  amount?: number;
  /** "XP" (violet pill, flies to the XP counter) or "xương" (sun pill, give `target` and `arriveEvent` of the bone chip). */
  unit?: string;
  target?: string;
  arriveEvent?: string;
  className?: string;
}) {
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
      window.dispatchEvent(new Event(arriveEvent));
      return;
    }
    const a = el.getBoundingClientRect();
    const t = document.querySelector(`[${target}]`)?.getBoundingClientRect();
    const flight: Flight = {
      id: trigger,
      from: { x: a.left + a.width / 2, y: a.top + a.height / 2 },
      to: t ? { x: t.left + t.width / 2, y: t.top + t.height / 2 } : null,
    };
    const id = requestAnimationFrame(() => setFlights((f) => [...f, flight]));
    return () => cancelAnimationFrame(id);
  }, [trigger, reduced, target, arriveEvent]);

  function land(flight: Flight) {
    setFlights((f) => f.filter((x) => x.id !== flight.id));
    if (flight.to) window.dispatchEvent(new Event(arriveEvent));
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
              className={cn(
                "pointer-events-none fixed top-0 left-0 z-50 -mt-3 -ml-7 rounded-full px-2.5 py-0.5 text-sm font-extrabold shadow-md",
                unit === "XP" ? "bg-xp-fg text-on-primary" : "bg-c-sun text-c-sun-on",
              )}
              initial={{ x: f.from.x, y: f.from.y, opacity: 0, scale: 0.8 }}
              animate={
                f.to
                  ? { x: f.to.x, y: f.to.y, opacity: [0, 1, 1, 0], scale: [0.8, 1.1, 1, 0.6] }
                  : { x: f.from.x, y: f.from.y - 36, opacity: [0, 1, 1, 0], scale: [0.8, 1.1, 1, 1] }
              }
              transition={{ duration: 0.65, ease: [0.2, 0.7, 0.3, 1], times: [0, 0.15, 0.8, 1] }}
              onAnimationComplete={() => land(f)}
            >
              +{amount} {unit}
            </m.span>
          )),
          document.body,
        )}
    </>
  );
}
