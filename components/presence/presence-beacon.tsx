"use client";

import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";
import { HEARTBEAT_MS } from "@/lib/presence";

function beat(path: string) {
  if (typeof document === "undefined" || document.visibilityState !== "visible") return;
  if (typeof navigator !== "undefined" && !navigator.onLine) return;
  void fetch("/api/presence", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ path }),
    keepalive: true,
    cache: "no-store",
  }).catch(() => undefined);
}

/** Tells the server this person is here (every 45 s while the tab is visible). Renders nothing. */
export function PresenceBeacon() {
  const pathname = usePathname();
  const pathRef = useRef(pathname);

  useEffect(() => {
    pathRef.current = pathname;
    beat(pathname);
  }, [pathname]);

  useEffect(() => {
    const timer = window.setInterval(() => beat(pathRef.current), HEARTBEAT_MS);
    const onVisible = () => beat(pathRef.current);
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      window.clearInterval(timer);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, []);

  return null;
}
