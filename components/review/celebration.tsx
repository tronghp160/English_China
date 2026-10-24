"use client";

import { useOptionalMe } from "@/components/app-shell/me-provider";
import { Confetti } from "@/components/fx/confetti";
import { EndPup } from "@/components/mascot/end-pup";
import type { PupMood } from "@/lib/mascot/lines";
import { cn } from "@/lib/utils";

/**
 * The one celebration of the app (REDESIGN_V2 §6.7): confetti once (about 1.2 s, in the palette, off with
 * reduced motion) and Bin beside the figure. `children` is the figure (a ring, a tile); without any,
 * Bin (or the check tile when Bin is off) is the figure.
 */
export function Celebration({
  mood = "cheer",
  confetti = true,
  size = 96,
  children,
  className,
}: {
  mood?: PupMood;
  confetti?: boolean;
  size?: number;
  children?: React.ReactNode;
  className?: string;
}) {
  const me = useOptionalMe();
  const mascot = me?.prefs.mascot !== false;

  return (
    <div className={cn("relative mx-auto flex w-fit items-center justify-center", className)}>
      {confetti && <Confetti preset="small" />}
      {children}
      {children ? (
        mascot && <EndPup mood={mood} size={Math.round(size * 0.8)} className="absolute -right-9 -bottom-2 self-auto" />
      ) : (
        <EndPup mood={mood} size={size} />
      )}
    </div>
  );
}
