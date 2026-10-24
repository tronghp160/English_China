import { Noto_Sans_SC } from "next/font/google";

/*
 * Chinese webfont. It is ~100 unicode-range @font-face rules of
 * render-blocking CSS, so only layouts that show words import this module
 * ((app), (study), (public)); the landing and sign-in pages stay light.
 * globals.css refers to them by family name, so portals (dialogs, toasts)
 * outside the layout wrapper get them too. Variable fonts: one rule set
 * covers every weight.
 */
export const notoSansSC = Noto_Sans_SC({ variable: "--font-noto-sans-sc", display: "swap", preload: false });

/** Put on the layout wrapper so the route bundles the font CSS. */
export const cjkFontVariables = notoSansSC.variable;
