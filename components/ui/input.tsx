import * as React from "react"
import { cn } from "cn"

function Input({ className, type, ...props }: React.ComponentProps<"input">) {
  return (
    <input
      type={type}
      data-slot="input"
      className={cn(
        "h-11 w-full min-w-0 rounded-md border border-input bg-surface px-3 py-2 text-base text-fg transition-colors outline-none file:inline-flex file:h-7 file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-fg-subtle hover:border-fg-muted/50 focus-visible:border-primary focus-visible:ring-3 focus-visible:ring-primary-soft disabled:pointer-events-none disabled:cursor-not-allowed disabled:bg-surface-2 disabled:opacity-60 aria-invalid:border-danger aria-invalid:ring-3 aria-invalid:ring-danger-soft md:text-sm",
        className
      )}
      {...props}
    />
  )
}

export { Input }
