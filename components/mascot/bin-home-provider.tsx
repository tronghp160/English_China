"use client";

import dynamic from "next/dynamic";
import { createContext, use, useCallback, useMemo, useState } from "react";

// Bin's corner is big (scene, drag and drop, outfits), so it only loads the first time someone opens it.
const BinHome = dynamic(() => import("./bin-home").then((m) => m.BinHome), { ssr: false });

type BinHomeContextValue = { open: () => void };

const BinHomeContext = createContext<BinHomeContextValue | null>(null);

/** Keeps one "Góc của Bin" sheet for the app; any button inside can open it with `useBinHome()`. */
export function BinHomeProvider({ children }: { children: React.ReactNode }) {
  const [mounted, setMounted] = useState(false);
  const [open, setOpen] = useState(false);
  const openHome = useCallback(() => {
    setMounted(true);
    setOpen(true);
  }, []);
  const value = useMemo(() => ({ open: openHome }), [openHome]);
  return (
    <BinHomeContext value={value}>
      {children}
      {mounted && <BinHome open={open} onOpenChange={setOpen} />}
    </BinHomeContext>
  );
}

/** `null` outside the app layout (public pages), so a Bin there simply has no way into the corner. */
export function useBinHome() {
  return use(BinHomeContext);
}
