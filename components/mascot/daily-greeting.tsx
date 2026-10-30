"use client";

import { useEffect, useState } from "react";
import type { BuddySpecies } from "@/lib/bin/buddies";
import { loadGreeting } from "@/lib/actions/bin";
import type { LineKey, PupMood } from "@/lib/mascot/lines";
import { MascotSay } from "./mascot-say";

export function DailyGreeting({
  fallback,
  situation,
  name,
  size = 56,
  className,
  hidePup = false,
  bubbleAction,
  today,
  outfit,
  buddy,
}: {
  fallback: { mood: PupMood; text: string; texts?: string[] };
  situation: LineKey;
  name: string;
  size?: number;
  className?: string;
  hidePup?: boolean;
  bubbleAction?: "trip" | "home";
  today: string;
  outfit?: string;
  buddy?: BuddySpecies | null;
}) {
  const [greeting, setGreeting] = useState<{ text: string; mood: PupMood } | null>(null);

  useEffect(() => {
    // Only query smart greeting for due, dueMany or allDone situations
    if (situation !== "due" && situation !== "dueMany" && situation !== "allDone") {
      return;
    }

    const storageKey = `sotu:bin-greeting:${today}`;
    let active = true;

    const fetchGreeting = async () => {
      try {
        const cached = window.sessionStorage.getItem(storageKey);
        if (cached) {
          const parsed = JSON.parse(cached) as { text?: string; mood?: PupMood };
          if (parsed.text && parsed.mood) {
            if (active) setGreeting({ text: parsed.text, mood: parsed.mood });
            return;
          }
        }
      } catch {
        // Ignore sessionStorage read errors
      }

      const res = await loadGreeting();
      if (!active || !res.ok || !res.data) return;
      setGreeting(res.data);
      try {
        window.sessionStorage.setItem(storageKey, JSON.stringify(res.data));
      } catch {
        // Ignore sessionStorage write errors
      }
    };

    void fetchGreeting();

    return () => {
      active = false;
    };
  }, [situation, today]);

  const mood = greeting?.mood ?? fallback.mood;
  const text = greeting?.text ?? fallback.text;
  const texts = greeting
    ? [greeting.text, ...(fallback.texts ?? [fallback.text]).filter((t) => t !== greeting.text)]
    : fallback.texts;

  return (
    <MascotSay
      mood={mood}
      name={name}
      text={text}
      texts={texts}
      size={size}
      className={className}
      hidePup={hidePup}
      bubbleAction={bubbleAction}
      outfit={outfit}
      buddy={buddy}
    />
  );
}
