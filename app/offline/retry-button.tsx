"use client";

import { RotateCw } from "lucide-react";
import { useEffect } from "react";
import { Button } from "@/components/ui/button";

/** Reloads the page the user was trying to open; also reloads by itself once back online. */
export function RetryButton() {
  useEffect(() => {
    const onOnline = () => window.location.reload();
    window.addEventListener("online", onOnline);
    return () => window.removeEventListener("online", onOnline);
  }, []);

  return (
    <Button type="button" size="lg" className="mt-6" onClick={() => window.location.reload()}>
      <RotateCw aria-hidden />
      Thử lại
    </Button>
  );
}
