/** How good a password looks while it is typed (REDESIGN_V3 §9.3): a 0 to 4 score, a word for it and what to add next. */

export type PasswordStrength = {
  /** 0 = nothing typed, 1 to 4 = the number of bars to fill */
  score: 0 | 1 | 2 | 3 | 4;
  label: string;
  /** A suggestion for the next step, "" when there is nothing to add */
  hint: string;
  checks: { length: boolean; letterAndDigit: boolean };
};

export const PASSWORD_LABELS = ["", "Mật khẩu yếu", "Mật khẩu hơi yếu", "Mật khẩu khá ổn", "Mật khẩu mạnh"] as const;

export function passwordStrength(password: string): PasswordStrength {
  const hasLetter = /\p{L}/u.test(password);
  const hasDigit = /\d/.test(password);
  const length = password.length >= 8;
  const checks = { length, letterAndDigit: hasLetter && hasDigit };
  if (!password) return { score: 0, label: "", hint: "", checks };

  // One bar for being started, then one each for the 8 characters, letters with digits, and extra length or variety.
  let score = 1;
  if (length) score++;
  if (checks.letterAndDigit) score++;
  const varied = /[^\p{L}\d]/u.test(password) || (/\p{Lu}/u.test(password) && /\p{Ll}/u.test(password));
  if (password.length >= 12 || (length && checks.letterAndDigit && varied)) score++;
  // Without the basics the bars stop at half way, however long the text is.
  if (!length || !checks.letterAndDigit) score = Math.min(score, 2);

  const hint = !length
    ? "Thêm ký tự để đủ 8"
    : !hasDigit
      ? "Thêm số để mạnh hơn"
      : !hasLetter
        ? "Thêm chữ để mạnh hơn"
        : score < 4
          ? "Dài hơn hoặc thêm ký tự đặc biệt để mạnh hơn"
          : "";
  const s = score as PasswordStrength["score"];
  return { score: s, label: PASSWORD_LABELS[s], hint, checks };
}
