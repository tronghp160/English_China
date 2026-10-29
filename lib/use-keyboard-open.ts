"use client";

import { useEffect, useState } from "react";

/** Detects if the mobile virtual keyboard is likely open by comparing visualViewport to innerHeight. */
export function useKeyboardOpen() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const vv = window.visualViewport;
    if (!vv) return;
    const onResize = () => setOpen(window.innerHeight - vv.height > 150);
    vv.addEventListener("resize", onResize);
    return () => vv.removeEventListener("resize", onResize);
  }, []);

  return open;
}
