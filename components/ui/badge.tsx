import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "cn"
import { Slot } from "radix-ui"

import type { Tone } from "@/lib/tone"

// Small chips (REDESIGN_V2 §5.4): soft color + bold text of the same hue; `tone` picks the hue of the `soft` variant.
const badgeVariants = cva(
  "group/badge inline-flex h-6 w-fit shrink-0 items-center justify-center gap-1 overflow-hidden rounded-full border border-transparent px-2.5 text-xs font-semibold whitespace-nowrap transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary has-data-[icon=inline-end]:pr-1.5 has-data-[icon=inline-start]:pl-1.5 aria-invalid:border-danger [&>svg]:pointer-events-none [&>svg]:size-3!",
  {
    variants: {
      variant: {
        default: "bg-primary text-on-primary [a]:hover:bg-primary-hover",
        secondary: "bg-primary-soft text-primary-fg [a]:hover:brightness-[0.97]",
        soft: "",
        success: "bg-success-soft text-success-fg",
        due: "bg-due-soft text-due-fg",
        destructive: "bg-danger-soft text-danger-fg [a]:hover:bg-[color-mix(in_oklab,var(--danger-soft),var(--danger)_10%)]",
        outline: "border-border-strong text-fg-muted [a]:hover:bg-surface-2 [a]:hover:text-fg",
        ghost: "text-fg-muted hover:bg-surface-2 hover:text-fg",
        link: "text-primary underline-offset-4 hover:underline",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

const SOFT_TONES: Record<Tone, string> = {
  blue: "bg-c-blue-soft text-c-blue-fg",
  coral: "bg-c-coral-soft text-c-coral-fg",
  mint: "bg-c-mint-soft text-c-mint-fg",
  sun: "bg-c-sun-soft text-c-sun-fg",
  grape: "bg-c-grape-soft text-c-grape-fg",
  pink: "bg-c-pink-soft text-c-pink-fg",
  orange: "bg-c-orange-soft text-c-orange-fg",
  teal: "bg-c-teal-soft text-c-teal-fg",
  red: "bg-c-red-soft text-c-red-fg",
}

function Badge({
  className,
  variant = "default",
  tone,
  asChild = false,
  ...props
}: React.ComponentProps<"span"> &
  VariantProps<typeof badgeVariants> & { asChild?: boolean; tone?: Tone }) {
  const Comp = asChild ? Slot.Root : "span"

  return (
    <Comp
      data-slot="badge"
      data-variant={variant}
      className={cn(badgeVariants({ variant }), variant === "soft" && SOFT_TONES[tone ?? "blue"], className)}
      {...props}
    />
  )
}

export { Badge, badgeVariants }
