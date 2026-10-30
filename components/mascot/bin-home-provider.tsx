"use client";

import dynamic from "next/dynamic";
import { createContext, use, useCallback, useMemo, useState } from "react";

// Bin's corner is big (scene, drag and drop, outfits), so it only loads the first time someone opens it.
const BinHome = dynamic(() => import("./bin-home").then((m) => m.BinHome), { ssr: false });

export type BinPanel = "main" | "decor" | "trip" | "buddies";

const VALID_PANELS: ReadonlySet<string> = new Set<BinPanel>(["main", "decor", "trip", "buddies"]);

type BinHomeContextValue = { open: (panel?: BinPanel | unknown) => void };

const BinHomeContext = createContext<BinHomeContextValue | null>(null);

/** Keeps one "Góc của Bin" sheet for the app; any button inside can open it with `useBinHome()`. */
export function BinHomeProvider({ children }: { children: React.ReactNode }) {
  const [mounted, setMounted] = useState(false);
  const [open, setOpen] = useState(false);
  const [panel, setPanel] = useState<BinPanel>("main");
  const openHome = useCallback((target?: BinPanel | unknown) => {
    setMounted(true);
    const targetPanel: BinPanel =
      typeof target === "string" && VALID_PANELS.has(target) ? (target as BinPanel) : "main";
    setPanel(targetPanel);
    setOpen(true);
  }, []);
  const value = useMemo(() => ({ open: openHome }), [openHome]);
  return (
    <BinHomeContext value={value}>
      {children}
      {mounted && <BinHome open={open} onOpenChange={setOpen} initialPanel={panel} />}
    </BinHomeContext>
  );
}

/** `null` outside the app layout (public pages), so a Bin there simply has no way into the corner. */
export function useBinHome() {
  return use(BinHomeContext);
}
