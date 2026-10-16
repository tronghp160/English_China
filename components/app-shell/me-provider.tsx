"use client";

import { createContext, use } from "react";
import type { Prefs } from "@/lib/validation";

export type MeContextValue = {
  userId: string;
  displayName: string;
  username: string;
  studyLangs: ("en" | "zh")[];
  prefs: Required<Prefs>;
};

const MeContext = createContext<MeContextValue | null>(null);

export function MeProvider({ value, children }: { value: MeContextValue; children: React.ReactNode }) {
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
