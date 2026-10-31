import { describe, expect, it } from "vitest";
import { tutorEffort } from "@/lib/ai/tutor/effort";

describe("tutorEffort", () => {
  it("keeps quick questions on minimal thinking", () => {
    expect(tutorEffort("apple nghĩa là gì")).toBe("minimal");
    expect(tutorEffort("你好 đọc thế nào")).toBe("minimal");
    expect(tutorEffort("Giải thích từ 'sesquipedalian'")).toBe("minimal");
  });

  it("thinks a little more for corrections, comparisons and long asks", () => {
    expect(tutorEffort("Sửa giúp mình: I goes to school yesterday.")).toBe("low");
    expect(tutorEffort("phân biệt 的 và 得")).toBe("low");
    expect(tutorEffort("x".repeat(300))).toBe("low");
    expect(tutorEffort("I goes to school yesterday. She don't like it!")).toBe("low");
  });
});
