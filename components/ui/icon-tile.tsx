import type { LucideIcon } from "lucide-react"

import { TONE_CLASSES, type Tone } from "@/lib/tone"
import { cn } from "@/lib/utils"

const SIZES = {
  32: { box: "size-8 rounded-sm", icon: 18 },
  40: { box: "size-10 rounded-md", icon: 20 },
  44: { box: "size-11 rounded-md", icon: 22 },
  48: { box: "size-12 rounded-md", icon: 24 },
  72: { box: "size-[4.5rem] rounded-lg", icon: 34 },
} as const

/**
 * A rounded square holding an icon (REDESIGN_V2 §5.3): quick actions, mode tiles, settings rows, empty states.
 * Soft by default (pale hue, strong icon); `solid` is the saturated hue with a white icon.
 * Decorative: the label next to it carries the meaning.
 */
export function IconTile({
  icon: Icon,
  tone = "blue",
  size = 40,
  solid = false,
  className,
}: {
  icon: LucideIcon
  tone?: Tone
  size?: keyof typeof SIZES
  solid?: boolean
  className?: string
}) {
  const s = SIZES[size]
  return (
    <span
      aria-hidden
      className={cn(
        "inline-grid shrink-0 place-items-center",
        s.box,
        solid ? cn(TONE_CLASSES[tone].solid, "text-white") : cn(TONE_CLASSES[tone].soft, TONE_CLASSES[tone].fg),
        className
      )}
    >
      <Icon size={s.icon} strokeWidth={2.2} />
    </span>
  )
}
