import type { JSX } from "react";
import { cn } from "@/lib/utils";

/**
 * Visual elements for the room items (PLAN-bin-3.md §1.3).
 * Rendered using SVG with pup-ink outlines and palette tokens.
 */

export function RoomItemArt({ id, className }: { id: string; className?: string }): JSX.Element | null {
  switch (id) {
    // ---- Bowl ----
    case "bowl_basic":
      return (
        <svg viewBox="0 0 60 26" className={cn("w-full h-auto overflow-visible", className)} aria-hidden fill="none">
          <path d="M5 6 Q30 32 55 6" fill="var(--scene-bowl)" stroke="var(--pup-ink)" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
          <rect x="3" y="2" width="54" height="6" rx="3" fill="var(--scene-bowl-rim)" stroke="var(--pup-ink)" strokeWidth="3" />
        </svg>
      );
    case "bowl_blue":
      return (
        <svg viewBox="0 0 60 26" className={cn("w-full h-auto overflow-visible", className)} aria-hidden fill="none">
          <path d="M5 6 Q30 32 55 6" fill="var(--c-blue)" stroke="var(--pup-ink)" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
          <rect x="3" y="2" width="54" height="6" rx="3" fill="var(--primary)" stroke="var(--pup-ink)" strokeWidth="3" />
        </svg>
      );
    case "bowl_bamboo":
      return (
        <svg viewBox="0 0 60 26" className={cn("w-full h-auto overflow-visible", className)} aria-hidden fill="none">
          <path d="M5 6 Q30 32 55 6" fill="var(--scene-wood)" stroke="var(--pup-ink)" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
          <rect x="3" y="2" width="54" height="6" rx="3" fill="var(--scene-wood-dark)" stroke="var(--pup-ink)" strokeWidth="3" />
        </svg>
      );
    case "bowl_gold":
      return (
        <svg viewBox="0 0 60 26" className={cn("w-full h-auto overflow-visible", className)} aria-hidden fill="none">
          <path d="M5 6 Q30 32 55 6" fill="var(--scene-gold)" stroke="var(--pup-ink)" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
          <rect x="3" y="2" width="54" height="6" rx="3" fill="var(--c-sun-fg)" stroke="var(--pup-ink)" strokeWidth="3" />
        </svg>
      );

    // ---- Bed ----
    case "bed_cushion":
      return (
        <svg viewBox="0 0 130 44" className={cn("w-full h-auto overflow-visible", className)} aria-hidden fill="none">
          <ellipse cx="65" cy="22" rx="60" ry="18" fill="var(--scene-cushion)" stroke="var(--pup-ink)" strokeWidth="3" />
          <path d="M45 18 Q65 24 85 18" stroke="var(--c-pink)" strokeWidth="2.5" strokeLinecap="round" />
        </svg>
      );
    case "bed_basket":
      return (
        <svg viewBox="0 0 130 44" className={cn("w-full h-auto overflow-visible", className)} aria-hidden fill="none">
          <ellipse cx="65" cy="24" rx="60" ry="17" fill="var(--scene-wood)" stroke="var(--pup-ink)" strokeWidth="3" />
          <path d="M10 20 Q65 38 120 20" stroke="var(--scene-wood-dark)" strokeWidth="3" strokeLinecap="round" fill="none" />
          <ellipse cx="65" cy="19" rx="50" ry="12" fill="var(--scene-cushion)" />
        </svg>
      );
    case "bed_cloud":
      return (
        <svg viewBox="0 0 130 44" className={cn("w-full h-auto overflow-visible", className)} aria-hidden fill="none">
          <path
            d="M20 28 Q15 15 35 15 Q45 8 65 10 Q85 6 95 18 Q115 15 115 28 Q115 38 95 40 Q65 42 35 40 Q15 40 20 28 Z"
            fill="var(--pup-fur)"
            stroke="var(--pup-ink)"
            strokeWidth="3"
            strokeLinejoin="round"
          />
        </svg>
      );
    case "bed_royal":
      return (
        <svg viewBox="0 0 130 44" className={cn("w-full h-auto overflow-visible", className)} aria-hidden fill="none">
          <ellipse cx="65" cy="22" rx="60" ry="18" fill="var(--c-grape-soft)" stroke="var(--pup-ink)" strokeWidth="3" />
          <ellipse cx="65" cy="22" rx="50" ry="12" stroke="var(--scene-gold)" strokeWidth="2.5" strokeDasharray="6 4" fill="none" />
        </svg>
      );

    // ---- Wall ----
    case "wall_sun":
      return (
        <svg viewBox="0 0 70 56" className={cn("w-full h-auto overflow-visible", className)} aria-hidden fill="none">
          <rect x="5" y="4" width="60" height="48" rx="6" fill="var(--surface)" stroke="var(--scene-wood)" strokeWidth="4" />
          <circle cx="35" cy="28" r="10" fill="var(--c-sun)" />
          <line x1="35" y1="12" x2="35" y2="15" stroke="var(--c-sun-fg)" strokeWidth="2.5" strokeLinecap="round" />
          <line x1="35" y1="41" x2="35" y2="44" stroke="var(--c-sun-fg)" strokeWidth="2.5" strokeLinecap="round" />
          <line x1="19" y1="28" x2="22" y2="28" stroke="var(--c-sun-fg)" strokeWidth="2.5" strokeLinecap="round" />
          <line x1="48" y1="28" x2="51" y2="28" stroke="var(--c-sun-fg)" strokeWidth="2.5" strokeLinecap="round" />
        </svg>
      );
    case "wall_bone":
      return (
        <svg viewBox="0 0 70 56" className={cn("w-full h-auto overflow-visible", className)} aria-hidden fill="none">
          <rect x="5" y="4" width="60" height="48" rx="6" fill="var(--surface)" stroke="var(--scene-wood)" strokeWidth="4" />
          <path
            d="M22 28 Q24 23 28 25 L42 25 Q46 23 48 28 Q46 33 42 31 L28 31 Q24 33 22 28 Z"
            fill="var(--c-sun-soft)"
            stroke="var(--pup-ink)"
            strokeWidth="2.5"
            strokeLinejoin="round"
          />
        </svg>
      );
    case "wall_hanzi":
      return (
        <svg viewBox="0 0 70 56" className={cn("w-full h-auto overflow-visible", className)} aria-hidden fill="none">
          <rect x="5" y="4" width="60" height="48" rx="6" fill="var(--surface)" stroke="var(--scene-wood-dark)" strokeWidth="4" />
          <text x="35" y="37" textAnchor="middle" fontSize="26" fontWeight="bold" fill="var(--pup-ink)" fontFamily="Noto Sans SC, system-ui, sans-serif">
            学
          </text>
        </svg>
      );
    case "wall_map":
      return (
        <svg viewBox="0 0 70 56" className={cn("w-full h-auto overflow-visible", className)} aria-hidden fill="none">
          <rect x="5" y="4" width="60" height="48" rx="6" fill="var(--surface)" stroke="var(--scene-wood)" strokeWidth="4" />
          <rect x="14" y="16" width="16" height="12" rx="4" fill="var(--c-mint)" />
          <rect x="36" y="14" width="22" height="16" rx="5" fill="var(--c-mint)" />
          <rect x="42" y="34" width="12" height="10" rx="3" fill="var(--c-mint)" />
        </svg>
      );

    // ---- Toy ----
    case "toy_yarn":
      return (
        <svg viewBox="0 0 40 30" className={cn("w-full h-auto overflow-visible", className)} aria-hidden fill="none">
          <circle cx="20" cy="16" r="11" fill="var(--c-pink)" stroke="var(--pup-ink)" strokeWidth="3" />
          <path d="M13 13 Q20 20 27 15 M15 21 Q22 13 25 21" stroke="var(--c-pink-fg)" strokeWidth="2" strokeLinecap="round" />
          <path d="M28 23 Q34 27 38 21" stroke="var(--c-pink)" strokeWidth="2.5" strokeLinecap="round" />
        </svg>
      );
    case "toy_duck":
      return (
        <svg viewBox="0 0 40 30" className={cn("w-full h-auto overflow-visible", className)} aria-hidden fill="none">
          <path
            d="M8 22 Q12 14 22 14 Q22 8 28 8 Q34 8 34 14 Q38 14 36 17 Q32 18 30 18 Q32 24 24 25 Q14 26 8 22 Z"
            fill="var(--c-sun)"
            stroke="var(--pup-ink)"
            strokeWidth="2.5"
            strokeLinejoin="round"
          />
          <circle cx="27" cy="11" r="1.5" fill="var(--pup-ink)" />
          <path d="M33 13 Q38 14 33 16 Z" fill="var(--c-orange)" />
        </svg>
      );
    case "toy_frisbee":
      return (
        <svg viewBox="0 0 40 30" className={cn("w-full h-auto overflow-visible", className)} aria-hidden fill="none">
          <ellipse cx="20" cy="16" rx="16" ry="7" fill="var(--c-coral)" stroke="var(--pup-ink)" strokeWidth="3" />
          <ellipse cx="20" cy="15" rx="10" ry="4" stroke="var(--c-sun)" strokeWidth="2" fill="none" />
        </svg>
      );
    case "toy_kite":
      return (
        <svg viewBox="0 0 40 30" className={cn("w-full h-auto overflow-visible", className)} aria-hidden fill="none">
          <polygon points="20,3 33,15 20,27 7,15" fill="var(--c-red)" stroke="var(--pup-ink)" strokeWidth="2.5" strokeLinejoin="round" />
          <line x1="20" y1="3" x2="20" y2="27" stroke="var(--c-sun)" strokeWidth="2" />
          <line x1="7" y1="15" x2="33" y2="15" stroke="var(--c-sun)" strokeWidth="2" />
        </svg>
      );

    // ---- Rug ----
    case "rug_basic":
      return (
        <svg viewBox="0 0 200 46" className={cn("w-full h-full", className)} aria-hidden fill="none">
          <ellipse cx="100" cy="23" rx="98" ry="21" fill="var(--scene-rug)" />
        </svg>
      );
    case "rug_stripes":
      return (
        <svg viewBox="0 0 200 46" className={cn("w-full h-full", className)} aria-hidden fill="none">
          <ellipse cx="100" cy="23" rx="98" ry="21" fill="var(--scene-rug)" />
          <ellipse cx="100" cy="23" rx="72" ry="15" stroke="var(--surface)" strokeWidth="4" fill="none" />
          <ellipse cx="100" cy="23" rx="46" ry="9" stroke="var(--surface)" strokeWidth="3" fill="none" />
        </svg>
      );
    case "rug_paw":
      return (
        <svg viewBox="0 0 200 46" className={cn("w-full h-full", className)} aria-hidden fill="none">
          <ellipse cx="100" cy="23" rx="98" ry="21" fill="var(--c-orange-soft)" />
          <circle cx="85" cy="24" r="5" fill="var(--c-orange)" />
          <circle cx="77" cy="17" r="2.5" fill="var(--c-orange)" />
          <circle cx="85" cy="15" r="2.5" fill="var(--c-orange)" />
          <circle cx="93" cy="17" r="2.5" fill="var(--c-orange)" />
          <circle cx="125" cy="24" r="5" fill="var(--c-orange)" />
          <circle cx="117" cy="17" r="2.5" fill="var(--c-orange)" />
          <circle cx="125" cy="15" r="2.5" fill="var(--c-orange)" />
          <circle cx="133" cy="17" r="2.5" fill="var(--c-orange)" />
        </svg>
      );
    case "rug_rainbow":
      return (
        <svg viewBox="0 0 200 46" className={cn("w-full h-full", className)} aria-hidden fill="none">
          <ellipse cx="100" cy="23" rx="98" ry="21" fill="var(--c-pink-soft)" />
          <ellipse cx="100" cy="23" rx="80" ry="17" stroke="var(--c-sun)" strokeWidth="4" fill="none" />
          <ellipse cx="100" cy="23" rx="60" ry="13" stroke="var(--c-mint)" strokeWidth="4" fill="none" />
          <ellipse cx="100" cy="23" rx="40" ry="8" stroke="var(--primary)" strokeWidth="4" fill="none" />
        </svg>
      );

    // ---- Corner ----
    case "corner_cactus":
      return (
        <svg viewBox="0 0 44 80" className={cn("w-full h-auto overflow-visible", className)} aria-hidden fill="none">
          <polygon points="10,50 34,50 30,76 14,76" fill="var(--scene-wood)" stroke="var(--pup-ink)" strokeWidth="3" strokeLinejoin="round" />
          <path d="M22 50 V18" stroke="var(--scene-plant)" strokeWidth="12" strokeLinecap="round" />
          <path d="M14 36 H22 M30 30 H22" stroke="var(--scene-plant)" strokeWidth="6" strokeLinecap="round" />
        </svg>
      );
    case "corner_monstera":
      return (
        <svg viewBox="0 0 44 80" className={cn("w-full h-auto overflow-visible", className)} aria-hidden fill="none">
          <polygon points="10,54 34,54 30,78 14,78" fill="var(--surface-2)" stroke="var(--pup-ink)" strokeWidth="3" strokeLinejoin="round" />
          <path d="M22 54 Q10 32 8 16 Q20 20 22 54" fill="var(--scene-plant)" stroke="var(--pup-ink)" strokeWidth="2.5" />
          <path d="M22 54 Q34 30 38 18 Q26 22 22 54" fill="var(--scene-plant)" stroke="var(--pup-ink)" strokeWidth="2.5" />
        </svg>
      );
    case "corner_lantern":
      return (
        <svg viewBox="0 0 44 80" className={cn("w-full h-auto overflow-visible", className)} aria-hidden fill="none">
          <line x1="22" y1="0" x2="22" y2="18" stroke="var(--pup-ink)" strokeWidth="2" />
          <ellipse cx="22" cy="38" rx="14" ry="18" fill="var(--c-red)" stroke="var(--pup-ink)" strokeWidth="3" />
          <line x1="16" y1="22" x2="28" y2="22" stroke="var(--scene-gold)" strokeWidth="3" />
          <line x1="16" y1="54" x2="28" y2="54" stroke="var(--scene-gold)" strokeWidth="3" />
          <line x1="22" y1="56" x2="22" y2="76" stroke="var(--scene-gold)" strokeWidth="3" strokeLinecap="round" />
        </svg>
      );
    case "corner_bus":
      return (
        <svg viewBox="0 0 44 80" className={cn("w-full h-auto overflow-visible", className)} aria-hidden fill="none">
          <rect x="4" y="34" width="36" height="34" rx="6" fill="var(--c-red)" stroke="var(--pup-ink)" strokeWidth="3" />
          <rect x="8" y="40" width="12" height="9" rx="2" fill="var(--surface)" />
          <rect x="24" y="40" width="12" height="9" rx="2" fill="var(--surface)" />
          <rect x="8" y="52" width="12" height="9" rx="2" fill="var(--surface)" />
          <rect x="24" y="52" width="12" height="9" rx="2" fill="var(--surface)" />
          <circle cx="12" cy="70" r="4" fill="var(--pup-ink)" />
          <circle cx="32" cy="70" r="4" fill="var(--pup-ink)" />
        </svg>
      );

    // Special note left by Bin on a trip
    case "note":
      return (
        <svg viewBox="0 0 40 30" className={cn("w-full h-auto overflow-visible", className)} aria-hidden fill="none">
          <polygon points="6,4 34,4 32,26 8,26" fill="var(--surface)" stroke="var(--pup-ink)" strokeWidth="2.5" strokeLinejoin="round" />
          <line x1="12" y1="10" x2="28" y2="10" stroke="var(--fg-muted)" strokeWidth="2" strokeLinecap="round" strokeDasharray="3 3" />
          <line x1="12" y1="16" x2="24" y2="16" stroke="var(--fg-muted)" strokeWidth="2" strokeLinecap="round" strokeDasharray="3 3" />
          <circle cx="28" cy="20" r="2" fill="var(--c-pink)" />
        </svg>
      );

    default:
      return null;
  }
}

export function RoomItemIcon({ id, size = 40 }: { id: string; size?: number }): JSX.Element {
  if (id.endsWith("_none")) {
    return (
      <svg width={size} height={size} viewBox="0 0 40 40" fill="none" stroke="var(--fg-muted)" strokeWidth="2" aria-hidden className="opacity-40">
        <circle cx="20" cy="20" r="14" strokeDasharray="4 3" />
        <line x1="10" y1="10" x2="30" y2="30" />
      </svg>
    );
  }
  return (
    <div style={{ width: size, height: size }} className="grid place-items-center overflow-hidden p-1">
      <RoomItemArt id={id} className="max-h-full max-w-full" />
    </div>
  );
}
