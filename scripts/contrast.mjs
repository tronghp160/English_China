// Usage: node scripts/contrast.mjs
// WCAG contrast check for the text/background pairs of the "Sáng Màu" palette (docs/redesign-v2/REDESIGN_V2.md §3).
// Mirror any new pair here when you add one to app/globals.css; exits 1 if a pair is under its minimum.

// color-mix(in oklab, color 18%, surface) approximated in sRGB: close enough for a contrast check
function mix(a, b, pct) {
  const ca = [1, 3, 5].map((i) => parseInt(a.slice(i, i + 2), 16));
  const cb = [1, 3, 5].map((i) => parseInt(b.slice(i, i + 2), 16));
  return "#" + ca.map((v, i) => Math.round(v * pct + cb[i] * (1 - pct)).toString(16).padStart(2, "0")).join("");
}

const light = {
  canvas: "#F4F5F9",
  surface: "#FFFFFF",
  surface2: "#EEF0F6",
  fg: "#12131A",
  fgMuted: "#565B6E",
  fgSubtle: "#646B7E",
  primary: "#3557F5",
  primaryHover: "#2A47D6",
  primarySoft: "#E6ECFF",
  primaryFg: "#2443C7",
  primaryPress: "#1F36A8",
  onPrimary: "#FFFFFF",
  blueSoft: "#E6ECFF",
  blueFg: "#2443C7",
  coral: "#FF5C4D",
  coralSoft: "#FFE7E3",
  coralFg: "#C7311F",
  mint: "#0EA371",
  mintSoft: "#DDF6EC",
  mintFg: "#08724F",
  sun: "#FFC23D",
  sunOn: "#4D3200",
  sunSoft: "#FFF2CC",
  sunFg: "#855400",
  grapeSoft: "#EFE7FF",
  grapeFg: "#5B2FCC",
  pinkSoft: "#FFE5F1",
  pinkFg: "#B3246A",
  orangeSoft: "#FFEBD9",
  orangeFg: "#A84A00",
  tealSoft: "#DAF5F7",
  tealFg: "#0B6F78",
  red: "#D6343A",
  redSoft: "#FFE5E5",
  redFg: "#B4232A",
  white: "#FFFFFF",
  rateAgain: "#D6343A",
  rateHard: "#B45600",
  rateGood: "#3557F5",
  rateEasy: "#08845A",
  tone1: "#D92D20",
  tone2: "#B45600",
  tone3: "#13804F",
  tone4: "#2F55D4",
};

const darkSurface = "#151821";
const dk = {
  canvas: "#0B0D12",
  surface: darkSurface,
  surface2: "#1C202B",
  fg: "#F3F5F9",
  fgMuted: "#A0A7B8",
  fgSubtle: "#8A91A5",
  primary: "#6F8BFF",
  primaryHover: "#8AA1FF",
  primarySoft: "#1B2347",
  primaryFg: "#A9BAFF",
  primaryPress: "#4B66D9",
  onPrimary: "#0B0D12",
  blueSoft: mix("#6F8BFF", darkSurface, 0.18),
  blueFg: "#A9BAFF",
  coral: "#FF7A6B",
  coralSoft: mix("#FF7A6B", darkSurface, 0.18),
  coralFg: "#FFB0A6",
  mint: "#3DD6A0",
  mintSoft: mix("#3DD6A0", darkSurface, 0.18),
  mintFg: "#8CEBC6",
  sun: "#FFD05C",
  sunOn: "#4D3200",
  sunSoft: mix("#FFD05C", darkSurface, 0.18),
  sunFg: "#FFE08F",
  grapeSoft: mix("#A98BFF", darkSurface, 0.18),
  grapeFg: "#CDBBFF",
  pinkSoft: mix("#FF7DB8", darkSurface, 0.18),
  pinkFg: "#FFB3D6",
  orangeSoft: mix("#FFA25C", darkSurface, 0.18),
  orangeFg: "#FFC594",
  tealSoft: mix("#3CCFD9", darkSurface, 0.18),
  tealFg: "#8FE6EC",
  red: "#FF6B6F",
  redSoft: mix("#FF6B6F", darkSurface, 0.18),
  redFg: "#FFA8AA",
  white: "#FFFFFF",
  rateAgain: "#E5484D",
  rateHard: "#B45309",
  rateGood: "#4F6DF0",
  rateEasy: "#0B8A5F",
  tone1: "#FF7070",
  tone2: "#FFAB4A",
  tone3: "#4CD38A",
  tone4: "#82A0FF",
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
  ["fg on canvas", "fg", "canvas", 4.5],
  ["fg on surface", "fg", "surface", 4.5],
  ["fg on surface-2", "fg", "surface2", 4.5],
  ["fg-muted on canvas", "fgMuted", "canvas", 4.5],
  ["fg-muted on surface", "fgMuted", "surface", 4.5],
  ["fg-muted on surface-2", "fgMuted", "surface2", 4.5],
  ["fg-subtle on surface (placeholder)", "fgSubtle", "surface", 4.5],
  ["fg-subtle on surface-2 (placeholder)", "fgSubtle", "surface2", 4.5],
  ["primary on surface", "primary", "surface", 4.5],
  ["primary on canvas", "primary", "canvas", 4.5],
  ["primary-fg on primary-soft", "primaryFg", "primarySoft", 4.5],
  ["primary-fg on surface", "primaryFg", "surface", 4.5],
  ["on-primary on primary (button)", "onPrimary", "primary", 4.5],
  ["on-primary on primary-hover", "onPrimary", "primaryHover", 4.5],
  ["primary-press on white (hero button text)", "primaryPress", "white", 4.5],
  ["en-fg on en-soft", "blueFg", "blueSoft", 4.5],
  ["zh-fg on zh-soft", "coralFg", "coralSoft", 4.5],
  ["zh-fg on surface", "coralFg", "surface", 4.5],
  ["success-fg on success-soft", "mintFg", "mintSoft", 4.5],
  ["success-fg on surface", "mintFg", "surface", 4.5],
  ["streak-fg on streak-soft", "sunFg", "sunSoft", 4.5],
  ["streak-fg on surface", "sunFg", "surface", 4.5],
  ["c-sun-on on c-sun (combo banner, medal)", "sunOn", "sun", 4.5],
  ["xp-fg on xp-soft", "grapeFg", "grapeSoft", 4.5],
  ["on-primary on xp-fg (XP burst pill)", "onPrimary", "grapeFg", 4.5],
  ["pink-fg on pink-soft", "pinkFg", "pinkSoft", 4.5],
  ["due-fg on due-soft", "orangeFg", "orangeSoft", 4.5],
  ["teal-fg on teal-soft", "tealFg", "tealSoft", 4.5],
  ["danger-fg on danger-soft", "redFg", "redSoft", 4.5],
  ["danger-fg on surface", "redFg", "surface", 4.5],
  ["fg on danger-soft", "fg", "redSoft", 4.5],
  ["fg on success-soft", "fg", "mintSoft", 4.5],
  ["fg on primary-soft", "fg", "primarySoft", 4.5],
  ["white on danger (confirm delete)", "white", "red", 3],
  ["on-primary on red (dark confirm delete)", "onPrimary", "red", 3],
  ["white on coral (large text only)", "white", "coral", 3],
  ["white on mint (large text, icons)", "white", "mint", 3],
  ["white on rate-again", "white", "rateAgain", 4.5],
  ["white on rate-hard", "white", "rateHard", 4.5],
  ["white on rate-good", "white", "rateGood", 4.5],
  ["white on rate-easy", "white", "rateEasy", 4.5],
  ["tone 1 on surface", "tone1", "surface", 4.5],
  ["tone 2 on surface", "tone2", "surface", 4.5],
  ["tone 3 on surface", "tone3", "surface", 4.5],
  ["tone 4 on surface", "tone4", "surface", 4.5],
];

let failed = 0;
for (const [mode, set] of [["light", light], ["dark", dk]]) {
  for (const [name, fg, bg, min] of pairs) {
    if (!set[fg] || !set[bg]) continue;
    // white-on-solid pairs only matter in light mode, where the solids are saturated
    if (mode === "dark" && fg === "white") continue;
    const r = ratio(set[fg], set[bg]);
    const ok = r >= min;
    if (!ok) failed++;
    console.log(`${ok ? "ok  " : "FAIL"} ${mode.padEnd(5)} ${r.toFixed(2).padStart(5)} (min ${min})  ${name}  ${set[fg]} on ${set[bg]}`);
  }
}
process.exit(failed ? 1 : 0);
