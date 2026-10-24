import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "cn"
import { Slot } from "radix-ui"

import type { Tone } from "@/lib/tone"

// Rounded, colored buttons (REDESIGN_V2 §5.1). Default size is 44px so every button meets the touch target.
// `pressable` is the CTA of a learning flow (a solid bottom edge that sinks on press); `soft` takes a `tone`.
const buttonVariants = cva(
  "group/button inline-flex shrink-0 items-center justify-center rounded-md border border-transparent bg-clip-padding text-sm font-semibold whitespace-nowrap transition-[color,background-color,border-color,box-shadow,transform] duration-[var(--dur-fast)] outline-none select-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary disabled:pointer-events-none disabled:opacity-50 aria-invalid:border-destructive [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-[1.125rem]",
  {
    variants: {
      variant: {
        default: "bg-primary text-on-primary shadow-sm hover:bg-primary-hover active:scale-[0.97]",
        pressable:
          "bg-primary text-on-primary shadow-[0_4px_0_0_var(--primary-press)] hover:bg-primary-hover active:translate-y-[3px] active:shadow-[0_1px_0_0_var(--primary-press)]",
        outline:
          "border-border-strong bg-surface text-fg hover:bg-surface-2 aria-expanded:bg-surface-2 active:scale-[0.97]",
        secondary:
          "bg-primary-soft text-primary-fg hover:brightness-[0.97] aria-expanded:bg-primary-soft active:scale-[0.97]",
        ghost:
          "text-fg hover:bg-surface-2 aria-expanded:bg-surface-2 active:not-aria-[haspopup]:scale-[0.97]",
        soft: "active:scale-[0.97]",
        // Confirmation of a delete is the one place a button turns solid red: `className="bg-danger text-white hover:bg-danger/90"`.
        destructive: "bg-danger-soft text-danger-fg hover:brightness-[0.97] active:scale-[0.97]",
        white: "bg-white text-primary-press shadow-md hover:bg-white/90 active:scale-[0.97]",
        link: "text-primary underline-offset-4 hover:underline",
      },
      size: {
        default:
          "h-12 gap-2 px-4 lg:h-11 has-data-[icon=inline-end]:pr-3 has-data-[icon=inline-start]:pl-3",
        xs: "h-8 gap-1 rounded-sm px-2.5 text-xs in-data-[slot=button-group]:rounded-lg [&_svg:not([class*='size-'])]:size-3.5",
        sm: "h-10 gap-1.5 rounded-sm px-3 text-sm in-data-[slot=button-group]:rounded-lg has-data-[icon=inline-end]:pr-2.5 has-data-[icon=inline-start]:pl-2.5 [&_svg:not([class*='size-'])]:size-4",
        lg: "h-13 gap-2 rounded-lg px-6 text-base has-data-[icon=inline-end]:pr-5 has-data-[icon=inline-start]:pl-5",
        xl: "h-14 gap-2 rounded-lg px-6 text-lg font-bold has-data-[icon=inline-end]:pr-5 has-data-[icon=inline-start]:pl-5",
        icon: "size-11",
        "icon-xs": "size-8 rounded-sm [&_svg:not([class*='size-'])]:size-3.5",
        "icon-sm": "size-9 rounded-sm [&_svg:not([class*='size-'])]:size-4",
        "icon-lg": "size-13",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

// Full class strings so Tailwind sees them.
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

// Pressable tones use the rating colors: white text passes AA on every one of them.
export type PressableTone = "primary" | "again" | "hard" | "good" | "easy"
const PRESSABLE_TONES: Record<PressableTone, string> = {
  primary: "",
  again:
    "bg-rate-again hover:bg-rate-again shadow-[0_4px_0_0_var(--rate-again-press)] active:shadow-[0_1px_0_0_var(--rate-again-press)] text-white",
  hard: "bg-rate-hard hover:bg-rate-hard shadow-[0_4px_0_0_var(--rate-hard-press)] active:shadow-[0_1px_0_0_var(--rate-hard-press)] text-white",
  good: "bg-rate-good hover:bg-rate-good shadow-[0_4px_0_0_var(--rate-good-press)] active:shadow-[0_1px_0_0_var(--rate-good-press)] text-white",
  easy: "bg-rate-easy hover:bg-rate-easy shadow-[0_4px_0_0_var(--rate-easy-press)] active:shadow-[0_1px_0_0_var(--rate-easy-press)] text-white",
}

function Button({
  className,
  variant = "default",
  size = "default",
  tone,
  asChild = false,
  ...props
}: React.ComponentProps<"button"> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean
    /** `soft`: one of the palette hues; `pressable`: a rating color. */
    tone?: Tone | PressableTone
  }) {
  const Comp = asChild ? Slot.Root : "button"
  const toneClass =
    variant === "soft"
      ? SOFT_TONES[(tone as Tone) ?? "blue"]
      : variant === "pressable" && tone
        ? PRESSABLE_TONES[tone as PressableTone]
        : undefined

  return (
    <Comp
      data-slot="button"
      data-variant={variant}
      data-size={size}
      className={cn(buttonVariants({ variant, size }), toneClass, className)}
      {...props}
    />
  )
}

export { Button, buttonVariants }
