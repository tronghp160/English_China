/** Combo rules shared by every study mode (REDESIGN_V3 §7.1): pure, so the thresholds are tested. */

/** The chip shows from this many right answers in a row. */
export const COMBO_CHIP_FROM = 3;

/** Milestones with a banner: 5, 10, then every 10 (20, 30, ...). */
export function isComboMilestone(combo: number): boolean {
  return combo === 5 || combo === 10 || (combo >= 20 && combo % 10 === 0);
}

/** From this combo the chip turns solid sun and the flame grows. */
export function isComboHot(combo: number): boolean {
  return combo >= 10;
}

/** The second half of the banner: "Combo ×5! Tuyệt vời". */
export function comboLine(combo: number): string {
  if (combo >= 20) return "Không ai cản nổi";
  if (combo >= 10) return "Quá đỉnh";
  return "Tuyệt vời";
}

/** Combo after an answer: one more when right, back to zero when wrong. */
export function nextCombo(combo: number, correct: boolean): number {
  return correct ? combo + 1 : 0;
}
