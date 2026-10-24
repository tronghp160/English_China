"use client";

import { Check, Copy } from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";

/** Copies the Zalo number, for people who add contacts by hand. */
export function CopyPhone({ phone, display, className }: { phone: string; display: string; className?: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(phone);
          setCopied(true);
          setTimeout(() => setCopied(false), 1800);
        } catch {
          // clipboard blocked: the number is on screen anyway
        }
      }}
      aria-label={copied ? "Đã chép số Zalo" : `Chép số Zalo ${display}`}
      className={cn(
        "inline-flex min-h-11 items-center gap-1.5 rounded-md border border-border bg-surface px-3 text-sm font-semibold text-fg transition-colors hover:bg-surface-2",
        className,
      )}
    >
      {copied ? <Check className="size-4 text-success-fg" aria-hidden /> : <Copy className="size-4" aria-hidden />}
      <span aria-live="polite">{copied ? "Đã chép" : "Chép số"}</span>
    </button>
  );
}
