/** The hues of the palette (REDESIGN_V2 §3.2) that decks, modes, tiles and chips can wear. */
export const TONES = ["blue", "coral", "mint", "sun", "grape", "pink", "orange", "teal", "red"] as const;
export type Tone = (typeof TONES)[number];

/**
 * Static class strings per tone: Tailwind only generates classes it can see in the source,
 * so never build `bg-c-${tone}` at runtime. `picked`: a radio card whose input is checked.
 */
export const TONE_CLASSES: Record<Tone, { solid: string; soft: string; fg: string; ring: string; bar: string; picked: string }> = {
  blue: { solid: "bg-c-blue", soft: "bg-c-blue-soft", fg: "text-c-blue-fg", ring: "ring-c-blue", bar: "bg-c-blue", picked: "has-checked:border-c-blue has-checked:bg-c-blue-soft has-checked:**:data-hint:text-c-blue-fg" },
  coral: { solid: "bg-c-coral", soft: "bg-c-coral-soft", fg: "text-c-coral-fg", ring: "ring-c-coral", bar: "bg-c-coral", picked: "has-checked:border-c-coral has-checked:bg-c-coral-soft has-checked:**:data-hint:text-c-coral-fg" },
  mint: { solid: "bg-c-mint", soft: "bg-c-mint-soft", fg: "text-c-mint-fg", ring: "ring-c-mint", bar: "bg-c-mint", picked: "has-checked:border-c-mint has-checked:bg-c-mint-soft has-checked:**:data-hint:text-c-mint-fg" },
  sun: { solid: "bg-c-sun", soft: "bg-c-sun-soft", fg: "text-c-sun-fg", ring: "ring-c-sun", bar: "bg-c-sun", picked: "has-checked:border-c-sun has-checked:bg-c-sun-soft has-checked:**:data-hint:text-c-sun-fg" },
  grape: { solid: "bg-c-grape", soft: "bg-c-grape-soft", fg: "text-c-grape-fg", ring: "ring-c-grape", bar: "bg-c-grape", picked: "has-checked:border-c-grape has-checked:bg-c-grape-soft has-checked:**:data-hint:text-c-grape-fg" },
  pink: { solid: "bg-c-pink", soft: "bg-c-pink-soft", fg: "text-c-pink-fg", ring: "ring-c-pink", bar: "bg-c-pink", picked: "has-checked:border-c-pink has-checked:bg-c-pink-soft has-checked:**:data-hint:text-c-pink-fg" },
  orange: { solid: "bg-c-orange", soft: "bg-c-orange-soft", fg: "text-c-orange-fg", ring: "ring-c-orange", bar: "bg-c-orange", picked: "has-checked:border-c-orange has-checked:bg-c-orange-soft has-checked:**:data-hint:text-c-orange-fg" },
  teal: { solid: "bg-c-teal", soft: "bg-c-teal-soft", fg: "text-c-teal-fg", ring: "ring-c-teal", bar: "bg-c-teal", picked: "has-checked:border-c-teal has-checked:bg-c-teal-soft has-checked:**:data-hint:text-c-teal-fg" },
  red: { solid: "bg-c-red", soft: "bg-c-red-soft", fg: "text-c-red-fg", ring: "ring-c-red", bar: "bg-c-red", picked: "has-checked:border-c-red has-checked:bg-c-red-soft has-checked:**:data-hint:text-c-red-fg" },
};

/** A stable hue for an id (user, group), so an avatar keeps its color everywhere. */
export function toneFor(seed: string): Tone {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0;
  return TONES[h % TONES.length];
}
