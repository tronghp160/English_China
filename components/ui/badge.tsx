import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "cn"
import { Slot } from "radix-ui"

// Small chips: 1px outline by default so tags (part of speech, CEFR, HSK) read as labels, not buttons.
const badgeVariants = cva(
  "group/badge inline-flex h-6 w-fit shrink-0 items-center justify-center gap-1 overflow-hidden rounded-chip border border-transparent px-2.5 text-xs font-medium whitespace-nowrap transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink-violet has-data-[icon=inline-end]:pr-1.5 has-data-[icon=inline-start]:pl-1.5 aria-invalid:border-seal [&>svg]:pointer-events-none [&>svg]:size-3!",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground [a]:hover:bg-ink-violet-hover",
        secondary: "bg-tint-violet text-ink-violet [a]:hover:bg-[color-mix(in_oklab,var(--tint-violet),var(--ink-violet)_8%)]",
        destructive: "bg-tint-seal text-seal-text [a]:hover:bg-[color-mix(in_oklab,var(--tint-seal),var(--seal)_10%)]",
        outline: "border-rule-strong text-ink-soft [a]:hover:bg-surface-sunk [a]:hover:text-ink",
        ghost: "text-ink-soft hover:bg-surface-sunk hover:text-ink",
        link: "text-ink-violet underline-offset-4 hover:underline",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

function Badge({
  className,
  variant = "default",
  asChild = false,
  ...props
}: React.ComponentProps<"span"> &
  VariantProps<typeof badgeVariants> & { asChild?: boolean }) {
  const Comp = asChild ? Slot.Root : "span"

  return (
    <Comp
      data-slot="badge"
      data-variant={variant}
      className={cn(badgeVariants({ variant }), className)}
      {...props}
    />
  )
}

export { Badge, badgeVariants }
