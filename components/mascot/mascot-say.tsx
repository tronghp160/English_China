"use client";

import { useEffect, useRef, useState } from "react";
import { say, type LineKey, type PupMood } from "@/lib/mascot/lines";
import { cn } from "@/lib/utils";
import { useBinHome } from "./bin-home-provider";
import { PettablePup } from "./pettable-pup";

/**
 * The puppy and what it says, in a chat bubble with a small tail pointing at it (REDESIGN_V2 §5.16).
 * Tapping the puppy swaps the line in place.
 */
export function MascotSay({
  mood,
  name,
  text,
  texts,
  size = 72,
  className,
  bubbleClassName,
  hidePup = false,
  bubbleAction,
  outfit,
}: {
  mood: PupMood;
  name: string;
  text: string;
  /** More lines to show in turn (every 15 s, only while the bubble is on screen and the tab is visible). */
  texts?: string[];
  size?: number;
  className?: string;
  bubbleClassName?: string;
  hidePup?: boolean;
  bubbleAction?: "trip" | "home";
  outfit?: string;
}) {
  const [reaction, setReaction] = useState<{ count: number; line?: LineKey } | null>(null);
  const home = useBinHome();
  const lines = texts && texts.length > 1 ? texts : null;
  const [turn, setTurn] = useState(0);
  const box = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = box.current;
    if (!lines || !el) return;
    let visible = false;
    let timer: ReturnType<typeof setInterval> | undefined;
    const stop = () => clearInterval(timer);
    const start = () => {
      stop();
      if (visible && !document.hidden) timer = setInterval(() => setTurn((t) => t + 1), 15_000);
    };
    const io = new IntersectionObserver(([e]) => {
      visible = e.isIntersecting;
      start();
    });
    io.observe(el);
    document.addEventListener("visibilitychange", start);
    return () => {
      io.disconnect();
      document.removeEventListener("visibilitychange", start);
      stop();
    };
  }, [lines]);

  const handleBubbleClick = () => {
    if (bubbleAction === "trip") {
      home?.open("trip");
    } else if (bubbleAction === "home") {
      home?.open();
    }
  };

  return (
    <div className={cn("flex items-end gap-2", className)}>
      {!hidePup && (
        <PettablePup mood={mood} name={name} size={size} outfit={outfit} onPet={(count, line) => setReaction({ count, line })} />
      )}
      <div
        ref={box}
        onClick={bubbleAction ? handleBubbleClick : undefined}
        role={bubbleAction ? "button" : undefined}
        tabIndex={bubbleAction ? 0 : undefined}
        onKeyDown={
          bubbleAction
            ? (e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  handleBubbleClick();
                }
              }
            : undefined
        }
        className={cn(
          "min-w-0 rounded-lg rounded-bl-[4px] bg-surface px-3.5 py-2.5 shadow-sm dark:border dark:border-border",
          bubbleAction && "cursor-pointer transition-transform active:scale-[0.98]",
          bubbleClassName,
        )}
      >
        <p
          key={reaction ? `p${reaction.count}` : `t${turn}`}
          aria-live="polite"
          className="animate-in fade-in-0 text-[0.9375rem] leading-snug font-medium text-fg duration-150"
        >
          {reaction ? say(reaction.line ?? "pet", { seed: Math.max(0, reaction.count - 1), name }) : lines ? lines[turn % lines.length] : text}
        </p>
        {reaction && home && (
          <button
            type="button"
            onClick={home.open}
            className="mt-1.5 min-h-9 rounded-full bg-primary-soft px-3 text-sm font-bold text-primary-fg hover:bg-primary-soft/70"
          >
            Chơi với {name}
          </button>
        )}
      </div>
    </div>
  );
}
