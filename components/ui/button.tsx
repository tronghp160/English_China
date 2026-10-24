import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "cn"
import { Slot } from "radix-ui"

// Flat ink buttons (REDESIGN_PLAN §5.3). Default size is 44px so every button meets the touch target.
const buttonVariants = cva(
  "group/button inline-flex shrink-0 items-center justify-center rounded-btn border border-transparent bg-clip-padding text-sm font-semibold whitespace-nowrap transition-[color,background-color,border-color,transform] duration-[var(--dur-fast)] outline-none select-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink-violet disabled:pointer-events-none disabled:opacity-50 aria-invalid:border-destructive [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-[1.125rem]",
  {
    variants: {
      variant: {
        default:
          "bg-primary text-primary-foreground hover:bg-ink-violet-hover active:translate-y-px",
        outline:
          "border-rule-strong bg-surface text-ink hover:bg-surface-sunk aria-expanded:bg-surface-sunk active:translate-y-px",
        secondary:
          "bg-tint-violet text-ink-violet hover:bg-[color-mix(in_oklab,var(--tint-violet),var(--ink-violet)_8%)] aria-expanded:bg-tint-violet active:translate-y-px",
        ghost:
          "text-ink hover:bg-surface-sunk aria-expanded:bg-surface-sunk active:not-aria-[haspopup]:translate-y-px",
        // Confirmation of a delete is the one place a button turns solid seal red: `className="bg-seal text-on-seal hover:bg-seal/90"`.
        destructive:
          "bg-tint-seal text-seal-text hover:bg-[color-mix(in_oklab,var(--tint-seal),var(--seal)_10%)] active:translate-y-px",
        link: "text-ink-violet underline-offset-4 hover:underline",
      },
      size: {
        default:
          "h-11 gap-2 px-4 has-data-[icon=inline-end]:pr-3 has-data-[icon=inline-start]:pl-3",
        xs: "h-8 gap-1 rounded-btn px-2.5 text-xs in-data-[slot=button-group]:rounded-lg [&_svg:not([class*='size-'])]:size-3.5",
        sm: "h-9 gap-1.5 px-3 text-sm in-data-[slot=button-group]:rounded-lg has-data-[icon=inline-end]:pr-2.5 has-data-[icon=inline-start]:pl-2.5 [&_svg:not([class*='size-'])]:size-4",
        lg: "h-13 gap-2 px-6 text-base has-data-[icon=inline-end]:pr-5 has-data-[icon=inline-start]:pl-5",
        icon: "size-11",
        "icon-xs": "size-8 [&_svg:not([class*='size-'])]:size-3.5",
        "icon-sm": "size-9 [&_svg:not([class*='size-'])]:size-4",
        "icon-lg": "size-13",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

function Button({
  className,
  variant = "default",
  size = "default",
  asChild = false,
  ...props
}: React.ComponentProps<"button"> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean
  }) {
  const Comp = asChild ? Slot.Root : "button"

  return (
    <Comp
      data-slot="button"
      data-variant={variant}
      data-size={size}
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  )
}

export { Button, buttonVariants }
