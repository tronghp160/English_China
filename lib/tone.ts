/** The hues of the palette (REDESIGN_V2 §3.2) that decks, modes, tiles and chips can wear. */
export const TONES = ["blue", "coral", "mint", "sun", "grape", "pink", "orange", "teal", "red"] as const;
export type Tone = (typeof TONES)[number];

/**
 * Static class strings per tone: Tailwind only generates classes it can see in the source,
 * so never build `bg-c-${tone}` at runtime.
 */
export const TONE_CLASSES: Record<Tone, { solid: string; soft: string; fg: string; ring: string; bar: string }> = {
  blue: { solid: "bg-c-blue", soft: "bg-c-blue-soft", fg: "text-c-blue-fg", ring: "ring-c-blue", bar: "bg-c-blue" },
  coral: { solid: "bg-c-coral", soft: "bg-c-coral-soft", fg: "text-c-coral-fg", ring: "ring-c-coral", bar: "bg-c-coral" },
  mint: { solid: "bg-c-mint", soft: "bg-c-mint-soft", fg: "text-c-mint-fg", ring: "ring-c-mint", bar: "bg-c-mint" },
  sun: { solid: "bg-c-sun", soft: "bg-c-sun-soft", fg: "text-c-sun-fg", ring: "ring-c-sun", bar: "bg-c-sun" },
  grape: { solid: "bg-c-grape", soft: "bg-c-grape-soft", fg: "text-c-grape-fg", ring: "ring-c-grape", bar: "bg-c-grape" },
  pink: { solid: "bg-c-pink", soft: "bg-c-pink-soft", fg: "text-c-pink-fg", ring: "ring-c-pink", bar: "bg-c-pink" },
  orange: { solid: "bg-c-orange", soft: "bg-c-orange-soft", fg: "text-c-orange-fg", ring: "ring-c-orange", bar: "bg-c-orange" },
  teal: { solid: "bg-c-teal", soft: "bg-c-teal-soft", fg: "text-c-teal-fg", ring: "ring-c-teal", bar: "bg-c-teal" },
  red: { solid: "bg-c-red", soft: "bg-c-red-soft", fg: "text-c-red-fg", ring: "ring-c-red", bar: "bg-c-red" },
};

/** A stable hue for an id (user, group), so an avatar keeps its color everywhere. */
export function toneFor(seed: string): Tone {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0;
  return TONES[h % TONES.length];
}
