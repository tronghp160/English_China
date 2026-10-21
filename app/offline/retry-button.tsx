"use client";

import { RotateCw } from "lucide-react";
import { useEffect } from "react";

/** Reloads the page the user was trying to open; also reloads by itself once back online. */
export function RetryButton() {
  useEffect(() => {
    const onOnline = () => window.location.reload();
    window.addEventListener("online", onOnline);
    return () => window.removeEventListener("online", onOnline);
  }, []);

  return (
    <button
      type="button"
      onClick={() => window.location.reload()}
      className="mt-6 inline-flex min-h-12 items-center gap-2 rounded-btn bg-primary px-5 text-base font-medium text-primary-foreground"
    >
      <RotateCw className="size-5" aria-hidden />
      Thử lại
    </button>
  );
}
