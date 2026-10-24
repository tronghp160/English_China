// Usage: node scripts/contrast.mjs
// WCAG contrast check for the text/background pairs of the "Vở mực tím" palette (REDESIGN_PLAN §4).
// Mirror any new pair here when you add one to app/globals.css; exits 1 if a pair is under its minimum.

const light = {
  paper: "#F5F6FA",
  surface: "#FFFFFF",
  sunk: "#EEEFF5",
  ink: "#1C1B26",
  inkSoft: "#5B5A6E",
  violet: "#3B2E8C",
  violetHover: "#2F2473",
  tintViolet: "#ECEAF7",
  seal: "#B8362B",
  tintSeal: "#FBECEA",
  leaf: "#1F6E50",
  tintLeaf: "#E6F2EC",
  turmericText: "#8A5A00",
  tintTurmeric: "#FBF1DC",
  onViolet: "#FFFFFF",
  onSeal: "#FFFFFF",
  tone1: "#C8302F",
  tone2: "#A65F00",
  tone3: "#1F7F3C",
  tone4: "#2F5BD3",
  hanziSeal: "#B8362B",
};
const dark = {
  paper: "#16151F",
  surface: "#1D1D27",
  sunk: "#24242F",
  ink: "#ECEBF3",
  inkSoft: "#A3A1B5",
  violet: "#B4A8FF",
  violetHover: "#C9BFFF",
  tintViolet: "#27234A",
  seal: "#FF8A78",
  tintSeal: "#3A1F22",
  leaf: "#6FD1A6",
  tintLeaf: "#16332A",
  turmericText: "#E9B54A",
  tintTurmeric: "#382B14",
  onViolet: "#16151F",
  onSeal: "#16151F",
  tone1: "#F07070",
  tone2: "#F0A030",
  tone3: "#4CC46A",
  tone4: "#7C9BF0",
};

function lum(hex) {
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255).map((c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}
function ratio(a, b) {
  const [hi, lo] = [lum(a), lum(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

// [name, foreground key, background key, minimum]
const pairs = [
  ["ink on paper", "ink", "paper", 4.5],
  ["ink on surface", "ink", "surface", 4.5],
  ["ink on sunk", "ink", "sunk", 4.5],
  ["ink-soft on paper", "inkSoft", "paper", 4.5],
  ["ink-soft on surface", "inkSoft", "surface", 4.5],
  ["ink-soft on sunk", "inkSoft", "sunk", 4.5],
  ["violet on surface", "violet", "surface", 4.5],
  ["violet on paper", "violet", "paper", 4.5],
  ["violet on tint-violet", "violet", "tintViolet", 4.5],
  ["on-violet on violet (primary button)", "onViolet", "violet", 4.5],
  ["on-violet on violet-hover", "onViolet", "violetHover", 4.5],
  ["seal on surface", "seal", "surface", 4.5],
  ["seal on paper", "seal", "paper", 4.5],
  ["seal on tint-seal", "seal", "tintSeal", 4.5],
  ["on-seal on seal (stamp, confirm delete)", "onSeal", "seal", 4.5],
  ["leaf on surface", "leaf", "surface", 4.5],
  ["leaf on tint-leaf", "leaf", "tintLeaf", 4.5],
  ["turmeric-text on surface", "turmericText", "surface", 4.5],
  ["turmeric-text on tint-turmeric", "turmericText", "tintTurmeric", 4.5],
  ["ink on tint-violet", "ink", "tintViolet", 4.5],
  ["ink on tint-leaf", "ink", "tintLeaf", 4.5],
  ["ink on tint-seal", "ink", "tintSeal", 4.5],
  ["ink on tint-turmeric", "ink", "tintTurmeric", 4.5],
  ["tone 1 on surface", "tone1", "surface", 4.5],
  ["tone 2 on surface", "tone2", "surface", 4.5],
  ["tone 3 on surface", "tone3", "surface", 4.5],
  ["tone 4 on surface", "tone4", "surface", 4.5],
];

let failed = 0;
for (const [mode, set] of [["light", light], ["dark", dark]]) {
  for (const [name, fg, bg, min] of pairs) {
    if (!set[fg] || !set[bg]) continue;
    const r = ratio(set[fg], set[bg]);
    const ok = r >= min;
    if (!ok) failed++;
    console.log(`${ok ? "ok  " : "FAIL"} ${mode.padEnd(5)} ${r.toFixed(2).padStart(5)} (min ${min})  ${name}  ${set[fg]} on ${set[bg]}`);
  }
}
process.exit(failed ? 1 : 0);
