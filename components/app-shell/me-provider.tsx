"use client";

import { createContext, use, useEffect } from "react";
import { setHapticsEnabled } from "@/lib/haptics";
import { setSfxEnabled } from "@/lib/sfx";
import type { Prefs } from "@/lib/validation";

export type MeContextValue = {
  userId: string;
  displayName: string;
  username: string;
  studyLangs: ("en" | "zh")[];
  prefs: Required<Prefs>;
  /** Cards due today across languages (the badge on the sidebar review button) */
  dueCount: number;
};

const MeContext = createContext<MeContextValue | null>(null);

export function MeProvider({ value, children }: { value: MeContextValue; children: React.ReactNode }) {
  // Sound and vibration are module switches (lib/sfx, lib/haptics); the prefs of the signed-in person set them.
  const { sound, haptics } = value.prefs;
  useEffect(() => setSfxEnabled(sound), [sound]);
  useEffect(() => setHapticsEnabled(haptics), [haptics]);
  return <MeContext value={value}>{children}</MeContext>;
}

export function useMe() {
  const me = use(MeContext);
  if (!me) throw new Error("useMe must be used inside the app layout");
  return me;
}

/** Same as useMe but returns null outside the app layout (e.g. focus routes). */
export function useOptionalMe() {
  return use(MeContext);
}
