import { describe, expect, it } from "vitest";
import { reminderPayload } from "@/lib/push";

describe("reminderPayload", () => {
  it("opens the review and replaces the previous reminder", () => {
    const p = reminderPayload(12);
    expect(p.url).toBe("/review");
    expect(p.tag).toBe("daily-reminder");
    expect(p.body).toContain("12 từ");
  });

  it("has its own wording for a single word", () => {
    expect(reminderPayload(1).body).toContain("1 từ");
    expect(reminderPayload(1).body).not.toContain("Vài phút");
  });
});
