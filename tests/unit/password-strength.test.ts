import { describe, expect, it } from "vitest";
import { passwordSchema } from "@/lib/validation";
import { passwordStrength } from "@/lib/password-strength";

describe("passwordStrength", () => {
  it("shows nothing for an empty password", () => {
    expect(passwordStrength("")).toMatchObject({ score: 0, label: "", hint: "" });
  });

  it("stays half way without the basics", () => {
    expect(passwordStrength("ab").score).toBe(1);
    expect(passwordStrength("abcdefgh").score).toBe(2);
    expect(passwordStrength("12345678").score).toBe(2);
    expect(passwordStrength("abcdefghijklmnopqrstuvwx").score).toBeLessThanOrEqual(2);
  });

  it("matches the mockup: letters only, 10 characters is 'hơi yếu' and asks for a digit", () => {
    const s = passwordStrength("hocmoingay");
    expect(s.score).toBe(2);
    expect(s.label).toBe("Mật khẩu hơi yếu");
    expect(s.hint).toBe("Thêm số để mạnh hơn");
    expect(s.checks).toEqual({ length: true, letterAndDigit: false });
  });

  it("reaches 3 with letters and digits and 4 when longer or varied", () => {
    expect(passwordStrength("hocmoingay1").score).toBe(3);
    expect(passwordStrength("HocMoiNgay1").score).toBe(4);
    expect(passwordStrength("hocmoingay123456").score).toBe(4);
    expect(passwordStrength("hoc-moi1").score).toBe(4);
  });

  it("agrees with the sign-up rule: a password the rule accepts always has both checks", () => {
    for (const p of ["Matkhau123", "hocmoingay1", "a1b2c3d4"]) {
      expect(passwordSchema.safeParse(p).success).toBe(true);
      expect(passwordStrength(p).checks).toEqual({ length: true, letterAndDigit: true });
    }
    for (const p of ["short1", "abcdefgh", "12345678"]) {
      expect(passwordSchema.safeParse(p).success).toBe(false);
    }
  });

  it("gives a label for every score", () => {
    for (const p of ["a", "abcdefgh", "abcdefg1", "Abcdefg1!"]) expect(passwordStrength(p).label).toBeTruthy();
  });
});
