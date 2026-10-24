import * as React from "react"
import { cn } from "cn"

function Textarea({ className, ...props }: React.ComponentProps<"textarea">) {
  return (
    <textarea
      data-slot="textarea"
      className={cn(
        "flex field-sizing-content min-h-20 w-full rounded-btn border border-input bg-surface px-3 py-2.5 text-base text-ink transition-colors outline-none placeholder:text-ink-faint hover:border-ink-soft/50 focus-visible:border-ink-violet focus-visible:ring-3 focus-visible:ring-tint-violet disabled:cursor-not-allowed disabled:bg-surface-sunk disabled:opacity-60 aria-invalid:border-seal aria-invalid:ring-3 aria-invalid:ring-tint-seal md:text-sm",
        className
      )}
      {...props}
    />
  )
}

export { Textarea }
