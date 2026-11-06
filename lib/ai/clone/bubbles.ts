/** Most bubbles one answer is split into; the rest of a longer answer goes into the last bubble. */
export const MAX_BUBBLES = 6;

/**
 * Pure. The companion writes like text messages: paragraphs separated by a blank line are shown as separate
 * bubbles, one under the other. Empty paragraphs are dropped; beyond MAX_BUBBLES the remaining paragraphs are
 * joined into the last bubble. While an answer streams, the last bubble is the one that grows.
 */
export function splitBubbles(text: string): string[] {
  const parts = text
    .replace(/\r/g, "")
    .split(/\n[ \t]*\n/)
    .map((p) => p.trim())
    .filter(Boolean);
  if (parts.length <= MAX_BUBBLES) return parts;
  return [...parts.slice(0, MAX_BUBBLES - 1), parts.slice(MAX_BUBBLES - 1).join("\n\n")];
}
