import { TONE_CLASSES, type Tone } from "@/lib/tone";

/** The hues a deck can wear (REDESIGN_V2 §3.3); red is kept for errors. */
export const DECK_COLORS = ["blue", "coral", "mint", "sun", "grape", "pink", "orange", "teal"] as const satisfies readonly Tone[];
export type DeckColor = (typeof DECK_COLORS)[number];

/** A stable color per deck id, so a deck looks the same on every screen. */
export function deckColor(id: string): DeckColor {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0;
  return DECK_COLORS[h % DECK_COLORS.length];
}

/** Static class strings for a deck color: `solid` fills, `soft` is the pale block, `fg` the text on it, `bar` the progress fill. */
export function deckColorClasses(c: DeckColor) {
  return TONE_CLASSES[c];
}
