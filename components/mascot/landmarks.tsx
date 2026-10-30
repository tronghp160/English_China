import type { JSX } from "react";
import { cn } from "@/lib/utils";

/**
 * Minimalist vector line art for the 24 landmarks (PLAN-bin-3.md §1.7.c).
 * Uses var(--pup-ink) stroke with clean geometric paths.
 */
export function Landmark({ id, className }: { id: string; className?: string }): JSX.Element {
  const common = {
    viewBox: "0 0 64 64",
    fill: "none",
    stroke: "var(--pup-ink, currentColor)",
    strokeWidth: 2,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    className: cn("size-full", className),
    "aria-hidden": true,
  };

  switch (id) {
    // en: London (Big Ben)
    case "london":
      return (
        <svg {...common}>
          <path d="M26 56V26h12v30" />
          <path d="M24 26l8-16 8 16" />
          <circle cx="32" cy="33" r="3.5" />
          <path d="M32 10V6" />
          <path d="M18 56h28" />
        </svg>
      );

    // en: Oxford (Bodleian Library / Radcliffe Camera)
    case "oxford":
      return (
        <svg {...common}>
          <path d="M22 56V34h20v22" />
          <path d="M20 34c0-8 5.5-14 12-14s12 6 12 14" />
          <path d="M32 20V12" />
          <path d="M26 44h12" />
          <path d="M16 56h32" />
        </svg>
      );

    // en: Edinburgh (Castle)
    case "edinburgh":
      return (
        <svg {...common}>
          <path d="M14 56l10-10h16l10 10" />
          <path d="M24 46V28h6v18" />
          <path d="M34 46V24h6v22" />
          <path d="M22 28h10" />
          <path d="M32 24h10" />
          <path d="M10 56h44" />
        </svg>
      );

    // en: Dublin (Trinity College campanile)
    case "dublin":
      return (
        <svg {...common}>
          <path d="M26 56V30h12v26" />
          <path d="M24 30c0-5 3.5-9 8-9s8 4 8 9" />
          <path d="M32 21V11" />
          <path d="M29 44h6" />
          <path d="M20 56h24" />
        </svg>
      );

    // en: New York (Statue of Liberty)
    case "new_york":
      return (
        <svg {...common}>
          <path d="M28 56l2-26h4l2 26" />
          <circle cx="32" cy="24" r="4" />
          <path d="M36 24l8-10" />
          <path d="M44 14l2-4" />
          <path d="M28 20l4 2 4-2" />
          <path d="M22 56h20" />
        </svg>
      );

    // en: San Francisco (Golden Gate Bridge)
    case "san_francisco":
      return (
        <svg {...common}>
          <path d="M20 56V14h4v42" />
          <path d="M40 56V14h4v42" />
          <path d="M10 32c10 6 12 10 12 10s8-12 20-10c12 2 12 10 12 10" />
          <path d="M10 42h44" />
          <path d="M8 56h48" />
        </svg>
      );

    // en: Toronto (CN Tower)
    case "toronto":
      return (
        <svg {...common}>
          <path d="M30 56l1-28h2l1 28" />
          <path d="M24 28h16l-3 6H27z" />
          <path d="M32 28V8" />
          <path d="M20 56h24" />
        </svg>
      );

    // en: Sydney (Opera House)
    case "sydney":
      return (
        <svg {...common}>
          <path d="M12 52c4-14 16-20 20-20-4 12-2 18-2 20" />
          <path d="M26 52c4-12 14-16 18-16-4 10-2 14-2 16" />
          <path d="M38 52c3-8 10-10 12-10-2 6-1 9-1 10" />
          <path d="M8 52h48" />
        </svg>
      );

    // en: Melbourne (Flinders St Station)
    case "melbourne":
      return (
        <svg {...common}>
          <path d="M18 56V36h28v20" />
          <path d="M26 36c0-6 2.5-12 6-12s6 6 6 12" />
          <path d="M32 24V14" />
          <circle cx="32" cy="42" r="3" />
          <path d="M14 56h36" />
        </svg>
      );

    // en: Auckland (Sky Tower)
    case "auckland":
      return (
        <svg {...common}>
          <path d="M29 56l2-30h2l2 30" />
          <ellipse cx="32" cy="26" rx="7" ry="3" />
          <path d="M32 23V8" />
          <path d="M22 56h20" />
        </svg>
      );

    // en: Cape Town (Table Mountain)
    case "cape_town":
      return (
        <svg {...common}>
          <path d="M10 52l6-16h32l6 16" />
          <path d="M20 36l3-8h18l3 8" />
          <path d="M6 52h52" />
        </svg>
      );

    // en: Singapore (Merlion)
    case "singapore":
      return (
        <svg {...common}>
          <path d="M28 20c0-6 4-10 8-10s6 4 6 8-4 8-8 12c-4 4-6 10-6 18h12c4-6 6-12 4-16" />
          <path d="M24 48c4 4 12 4 16 0" />
          <circle cx="33" cy="16" r="1.5" />
          <path d="M16 54h32" />
        </svg>
      );

    // zh: Beijing (Forbidden City)
    case "beijing":
      return (
        <svg {...common}>
          <path d="M16 54V38h32v16" />
          <path d="M12 38c6-4 12-8 20-8s14 4 20 8" />
          <path d="M16 30c5-3 10-6 16-6s11 3 16 6" />
          <path d="M32 24V14" />
          <path d="M28 54v-8h8v8" />
          <path d="M10 54h44" />
        </svg>
      );

    // zh: Shanghai (Oriental Pearl Tower)
    case "shanghai":
      return (
        <svg {...common}>
          <path d="M30 56l2-20h0l2 20" />
          <circle cx="32" cy="34" r="5" />
          <path d="M31 29V19h2v10" />
          <circle cx="32" cy="17" r="3" />
          <path d="M32 14V6" />
          <path d="M22 56h20" />
        </svg>
      );

    // zh: Xi'an (Terracotta Warrior)
    case "xian":
      return (
        <svg {...common}>
          <circle cx="32" cy="18" r="5" />
          <path d="M29 13h6v4" />
          <path d="M24 54l3-28h10l3 28" />
          <path d="M24 34h16" />
          <path d="M20 54h24" />
        </svg>
      );

    // zh: Hangzhou (West Lake Pagoda)
    case "hangzhou":
      return (
        <svg {...common}>
          <path d="M20 52l3-8h18l3 8" />
          <path d="M24 44l2-8h12l2 8" />
          <path d="M27 36l1-8h8l1 8" />
          <path d="M32 28V16" />
          <path d="M12 56c8-3 16 3 24 0s14-3 18 0" />
        </svg>
      );

    // zh: Suzhou (Classical Garden Pavilion)
    case "suzhou":
      return (
        <svg {...common}>
          <path d="M14 34c6-4 12-6 18-6s12 2 18 6" />
          <path d="M22 54V34h20v20" />
          <path d="M32 28V18" />
          <path d="M12 54h40" />
        </svg>
      );

    // zh: Chengdu (Giant Panda Reserve)
    case "chengdu":
      return (
        <svg {...common}>
          <circle cx="32" cy="36" r="12" />
          <circle cx="23" cy="25" r="3.5" />
          <circle cx="41" cy="25" r="3.5" />
          <circle cx="28" cy="34" r="2" />
          <circle cx="36" cy="34" r="2" />
          <ellipse cx="32" cy="40" rx="3" ry="2" />
          <path d="M18 54h28" />
        </svg>
      );

    // zh: Guilin (Li River Karst Peaks)
    case "guilin":
      return (
        <svg {...common}>
          <path d="M12 52c4-16 10-24 14-24s8 12 10 24" />
          <path d="M30 52c3-12 8-18 12-18s8 8 10 18" />
          <path d="M8 54c12-3 24 3 36 0s8-3 12 0" />
        </svg>
      );

    // zh: Lijiang (Old Town Rooftops)
    case "lijiang":
      return (
        <svg {...common}>
          <path d="M14 36c6-4 12-6 18-6s12 2 18 6" />
          <path d="M20 54V36h24v18" />
          <path d="M26 44h12" />
          <path d="M10 54h44" />
        </svg>
      );

    // zh: Harbin (Ice and Snow World Castle)
    case "harbin":
      return (
        <svg {...common}>
          <path d="M22 54V28l10-12 10 12v26" />
          <path d="M14 54V38l8-6" />
          <path d="M50 54V38l-8-6" />
          <path d="M32 16V8" />
          <path d="M10 54h44" />
        </svg>
      );

    // zh: Guangzhou (Canton Tower)
    case "guangzhou":
      return (
        <svg {...common}>
          <path d="M26 56c4-16 4-26 2-38" />
          <path d="M38 56c-4-16-4-26-2-38" />
          <ellipse cx="32" cy="18" rx="6" ry="2" />
          <ellipse cx="32" cy="38" rx="4" ry="1.5" />
          <path d="M32 16V6" />
          <path d="M20 56h24" />
        </svg>
      );

    // zh: Hong Kong (Victoria Harbour Skyline & Junk Boat)
    case "hong_kong":
      return (
        <svg {...common}>
          <path d="M14 42V18h8v24" />
          <path d="M24 42V24h10v18" />
          <path d="M36 42V14h8v28" />
          <path d="M18 52l6-4h16l6 4z" />
          <path d="M32 48V36l8 6z" />
          <path d="M10 56h44" />
        </svg>
      );

    // zh: Taipei (Taipei 101)
    case "taipei":
      return (
        <svg {...common}>
          <path d="M29 56V48h6v8" />
          <path d="M26 48l2-6h8l2 6z" />
          <path d="M27 42l2-6h6l2 6z" />
          <path d="M28 36l2-6h4l2 6z" />
          <path d="M32 30V10" />
          <path d="M20 56h24" />
        </svg>
      );

    default:
      return (
        <svg {...common}>
          <path d="M16 52l16-32 16 32" />
          <path d="M22 42h20" />
          <path d="M10 54h44" />
        </svg>
      );
  }
}
