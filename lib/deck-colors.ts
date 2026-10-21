/** Candy color per deck (stable from its id), for covers and progress bars. */
const TONES = [
  { cover: "bg-ink-blue", bar: "bg-ink-blue", wash: "bg-wash-blue" },
  { cover: "bg-grape", bar: "bg-grape", wash: "bg-wash-grape" },
  { cover: "bg-sky", bar: "bg-sky", wash: "bg-wash-sky" },
  { cover: "bg-sun", bar: "bg-sun", wash: "bg-wash-yellow" },
  { cover: "bg-jade", bar: "bg-jade", wash: "bg-wash-jade" },
  { cover: "bg-pink", bar: "bg-pink", wash: "bg-wash-pink" },
] as const;

export type DeckTone = (typeof TONES)[number];

export function deckTone(id: string): DeckTone {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0;
  return TONES[h % TONES.length];
}
