"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

export function AutoRefresh({ seconds = 30 }: { seconds?: number }) {
  const router = useRouter();

  useEffect(() => {
    const interval = window.setInterval(() => {
      if (typeof document !== "undefined" && document.visibilityState === "visible") {
        router.refresh();
      }
    }, seconds * 1000);

    return () => window.clearInterval(interval);
  }, [router, seconds]);

  return (
    <span className="text-xs text-fg-muted" aria-live="off">
      Tự làm mới mỗi {seconds} giây
    </span>
  );
}
