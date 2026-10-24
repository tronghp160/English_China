import * as React from "react"
import { cn } from "cn"

import { TONE_CLASSES, type Tone } from "@/lib/tone"

// Cards (REDESIGN_V2 §5.2). `default` is a white card with a soft shadow, `soft` a pale hue (no border),
// `solid` the one hero per screen, `outline` a plain bordered box. Group content with space and color,
// not with nested cards.
type CardProps = React.ComponentProps<"div"> & {
  variant?: "default" | "soft" | "solid" | "outline"
  /** soft / solid: the hue; soft without a tone is the pale primary */
  tone?: Tone
  /** Lifts on hover (for cards that are links or buttons) */
  interactive?: boolean
}

function Card({ className, variant = "default", tone, interactive, ...props }: CardProps) {
  return (
    <div
      data-slot="card"
      data-variant={variant}
      className={cn(
        "relative text-fg",
        variant === "default" && "rounded-lg border border-border/60 bg-surface shadow-sm dark:border-border",
        variant === "outline" && "rounded-lg border border-border bg-surface",
        variant === "soft" && ["rounded-lg", tone ? TONE_CLASSES[tone].soft : "bg-primary-soft"],
        variant === "solid" && [
          "rounded-xl text-white shadow-md",
          tone ? TONE_CLASSES[tone].solid : "bg-primary text-on-primary shadow-hero",
        ],
        interactive && "transition-[transform,box-shadow] duration-[var(--dur-base)] hover:-translate-y-0.5 hover:shadow-md",
        className
      )}
      {...props}
    />
  )
}

function CardHeader({ className, ...props }: React.ComponentProps<"div">) {
  return <div data-slot="card-header" className={cn("flex flex-col gap-1 p-5 md:p-6", className)} {...props} />
}

function CardTitle({ className, ...props }: React.ComponentProps<"h2">) {
  return <h2 data-slot="card-title" className={cn("text-lg font-bold text-fg", className)} {...props} />
}

function CardContent({ className, ...props }: React.ComponentProps<"div">) {
  return <div data-slot="card-content" className={cn("p-5 md:p-6", className)} {...props} />
}

export { Card, CardHeader, CardTitle, CardContent }
