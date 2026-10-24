/**
 * Notebook cover cloth per deck (stable from its id), for covers and progress bars.
 * `tint` is the matching pale background; `wash` is its old name, kept until callers moved over.
 */
const TONES = [
  { cover: "bg-cover-indigo", bar: "bg-cover-indigo", tint: "bg-primary-soft", wash: "bg-primary-soft" },
  { cover: "bg-cover-moss", bar: "bg-cover-moss", tint: "bg-success-soft", wash: "bg-success-soft" },
  { cover: "bg-cover-plum", bar: "bg-cover-plum", tint: "bg-danger-soft", wash: "bg-danger-soft" },
  { cover: "bg-cover-brick", bar: "bg-cover-brick", tint: "bg-danger-soft", wash: "bg-danger-soft" },
  { cover: "bg-cover-ochre", bar: "bg-cover-ochre", tint: "bg-streak-soft", wash: "bg-streak-soft" },
  { cover: "bg-cover-slate", bar: "bg-cover-slate", tint: "bg-surface-2", wash: "bg-surface-2" },
] as const;

export type DeckTone = (typeof TONES)[number];

export function deckTone(id: string): DeckTone {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0;
  return TONES[h % TONES.length];
}
