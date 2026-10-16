import { describe, expect, it } from "vitest";
import { authErrorMessage } from "@/components/auth/auth-shared";
import { emailSchema, passwordSchema } from "@/lib/validation";

describe("passwordSchema", () => {
  it("accepts 8+ characters with a letter and a digit", () => {
    expect(passwordSchema.safeParse("matkhau123").success).toBe(true);
    expect(passwordSchema.safeParse("Mậtkhẩu9").success).toBe(true);
  });
  it.each([
    ["abc123", "ít nhất 8"],
    ["abcdefgh", "chữ số"],
    ["12345678", "chữ cái"],
    ["a1".repeat(37), "tối đa 72"],
  ])("rejects %s", (pw, msg) => {
    const r = passwordSchema.safeParse(pw);
    expect(r.success).toBe(false);
    expect(r.error?.issues[0].message.toLowerCase()).toContain(msg);
  });
});

describe("emailSchema", () => {
  it("trims and lowercases", () => {
    expect(emailSchema.parse("  Ban@Gmail.COM ")).toBe("ban@gmail.com");
  });
  it("rejects malformed addresses", () => {
    expect(emailSchema.safeParse("ban@gmail").success).toBe(false);
    expect(emailSchema.safeParse("ban gmail.com").success).toBe(false);
  });
});

describe("authErrorMessage", () => {
  it("maps Supabase codes to Vietnamese", () => {
    expect(authErrorMessage({ code: "invalid_credentials", status: 400, message: "" })).toBe("Email hoặc mật khẩu không đúng.");
    expect(authErrorMessage({ code: "email_not_confirmed", status: 400, message: "" })).toContain("chưa được xác nhận");
    expect(authErrorMessage({ code: "user_already_exists", status: 422, message: "" })).toContain("đã có tài khoản");
  });
  it("falls back on status, then a generic message", () => {
    expect(authErrorMessage({ code: undefined, status: 429, message: "" })).toContain("quá nhiều lần");
    expect(authErrorMessage({ code: undefined, status: 500, message: "boom" })).toBe("Có lỗi khi kết nối máy chủ. Thử lại sau.");
  });
});
