/**
 * Notebook cover cloth per deck (stable from its id), for covers and progress bars.
 * `tint` is the matching pale background; `wash` is its old name, kept until callers moved over.
 */
const TONES = [
  { cover: "bg-cover-indigo", bar: "bg-cover-indigo", tint: "bg-tint-violet", wash: "bg-tint-violet" },
  { cover: "bg-cover-moss", bar: "bg-cover-moss", tint: "bg-tint-leaf", wash: "bg-tint-leaf" },
  { cover: "bg-cover-plum", bar: "bg-cover-plum", tint: "bg-tint-seal", wash: "bg-tint-seal" },
  { cover: "bg-cover-brick", bar: "bg-cover-brick", tint: "bg-tint-seal", wash: "bg-tint-seal" },
  { cover: "bg-cover-ochre", bar: "bg-cover-ochre", tint: "bg-tint-turmeric", wash: "bg-tint-turmeric" },
  { cover: "bg-cover-slate", bar: "bg-cover-slate", tint: "bg-surface-sunk", wash: "bg-surface-sunk" },
] as const;

export type DeckTone = (typeof TONES)[number];

export function deckTone(id: string): DeckTone {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0;
  return TONES[h % TONES.length];
}
