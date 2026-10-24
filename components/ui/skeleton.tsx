import { cn } from "cn"

// A very soft pulse; switched off by the reduced-motion rule in globals.css.
function Skeleton({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="skeleton"
      className={cn("animate-pulse rounded-md bg-surface-sunk", className)}
      {...props}
    />
  )
}

export { Skeleton }
