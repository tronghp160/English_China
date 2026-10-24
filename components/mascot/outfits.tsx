import type { OutfitId } from "@/lib/progress";

/**
 * What Bin can wear (REDESIGN_V3 §4.5), drawn in the same 120×120 box as the puppy so it lands on the right
 * spot. The strokes come from the parent <svg> (ink, round caps); only fills are set here, from the palette
 * tokens. `OutfitHead` goes inside the head group (it follows nods and tilts), `OutfitNeck` sits over the
 * collar. Glasses are drawn by `OutfitHead` over the eyes.
 */

const INK = "var(--pup-ink)";
const FEATURE = "var(--pup-feature)";

function Glasses() {
  return (
    <g stroke={FEATURE}>
      <rect x={34} y={42} width={22} height={15} rx={7} fill={FEATURE} />
      <rect x={64} y={42} width={22} height={15} rx={7} fill={FEATURE} />
      <path d="M56 47h8" />
      <path d="M38 46l5-2M68 46l5-2" stroke="var(--pup-fur)" strokeWidth={2} />
    </g>
  );
}

function Bow() {
  return (
    <g transform="rotate(-14 36 26)">
      <path d="M36 26L23 17v18z" fill="var(--c-pink)" />
      <path d="M36 26l13-9v18z" fill="var(--c-pink)" />
      <circle cx={36} cy={26} r={3.6} fill="var(--c-pink-fg)" />
    </g>
  );
}

function Cap() {
  return (
    <g transform="rotate(-7 60 30)">
      <path d="M35 34C34 11 86 11 85 34z" fill="var(--primary)" />
      <path d="M60 12.5v21" strokeWidth={1.4} />
      <circle cx={60} cy={11.5} r={2.4} fill="var(--c-sun)" />
      <path d="M30 34c14 6 46 6 60 0c1 5-14 8-30 8s-31-3-30-8z" fill="var(--primary)" />
    </g>
  );
}

function Party() {
  return (
    <g transform="rotate(5 60 26)">
      <path d="M45 28L60 -2L75 28z" fill="var(--c-pink)" />
      <path d="M50.2 18.5l19.6 0M46.6 25.5l26.8 0" stroke="var(--c-sun)" strokeWidth={3.4} />
      <circle cx={60} cy={-2.5} r={4} fill="var(--c-sun)" />
    </g>
  );
}

function Wizard() {
  return (
    <g transform="rotate(-4 60 28)">
      <path d="M38 29C46 24 56 10 63 -7C66 7 74 19 84 29z" fill="var(--c-grape)" />
      <path d="M28 30q32 9 64 0q-2 6-32 7q-30-1-32-7z" fill="var(--c-grape)" />
      <path d="M58 16l1.6 3.4 3.7.4-2.8 2.5.8 3.7-3.3-1.9-3.3 1.9.8-3.7-2.8-2.5 3.7-.4z" fill="var(--c-sun)" strokeWidth={1} />
    </g>
  );
}

function Crown() {
  return (
    <g transform="rotate(4 60 22)">
      <path d="M43 25L39 8l11 8 10-12 10 12 11-8-4 17z" fill="var(--c-sun)" />
      <circle cx={60} cy={19} r={2.2} fill="var(--c-coral)" strokeWidth={1} />
      <circle cx={50} cy={20.5} r={1.5} fill="var(--c-mint)" strokeWidth={0.8} />
      <circle cx={70} cy={20.5} r={1.5} fill="var(--c-mint)" strokeWidth={0.8} />
    </g>
  );
}

/** Hats, bow and glasses: inside the head group. */
export function OutfitHead({ outfit }: { outfit: OutfitId | string }) {
  switch (outfit) {
    case "glasses":
      return <Glasses />;
    case "bow":
      return <Bow />;
    case "cap":
      return <Cap />;
    case "party":
      return <Party />;
    case "wizard":
      return <Wizard />;
    case "crown":
      return <Crown />;
    default:
      return null;
  }
}

/** The scarf wraps the neck over the collar; its end flutters a little (CSS `.bin-scarf-tail`). */
export function OutfitNeck({ outfit }: { outfit: OutfitId | string }) {
  if (outfit !== "scarf") return null;
  return (
    <g>
      <path d="M41 81q19 10 38 0" stroke="var(--c-coral)" strokeWidth={6.5} />
      <path className="bin-scarf-tail" d="M66 86l5 15 8-3-5-14z" fill="var(--c-coral)" strokeWidth={2} />
    </g>
  );
}

/** The part of the 120×120 box each outfit occupies, for the icon tiles (Bin's corner, Settings). */
const ICON_BOX: Record<string, string> = {
  none: "0 0 120 120",
  scarf: "34 72 54 36",
  bow: "14 8 44 36",
  glasses: "28 36 64 28",
  cap: "26 4 68 42",
  party: "38 -10 44 44",
  wizard: "24 -10 72 52",
  crown: "32 0 56 32",
};

/** An outfit on its own, as a small icon. */
export function OutfitIcon({ outfit, size = 40 }: { outfit: OutfitId | string; size?: number }) {
  const box = ICON_BOX[outfit] ?? ICON_BOX.none;
  return (
    <svg
      viewBox={box}
      width={size}
      height={size}
      aria-hidden
      fill="none"
      stroke={INK}
      strokeWidth={3}
      strokeLinecap="round"
      strokeLinejoin="round"
      className="shrink-0 overflow-visible"
      // On a tile (not on the fur) the dark parts follow the text color, so the glasses show in dark mode too
      style={{ "--pup-feature": "var(--fg)", "--pup-ink": "var(--fg)" } as React.CSSProperties}
    >
      {outfit === "none" ? <path d="M30 30L90 90M90 30L30 90" strokeWidth={8} stroke="var(--fg-subtle)" /> : null}
      <OutfitHead outfit={outfit} />
      <OutfitNeck outfit={outfit} />
    </svg>
  );
}
