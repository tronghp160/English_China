import { describe, expect, it } from "vitest";
import { computeAttention, type AttentionInput } from "@/lib/admin-attention";

describe("computeAttention", () => {
  const baseInput: AttentionInput = {
    today: "2026-10-28",
    now: new Date("2026-10-28T12:00:00Z").getTime(),
    aiLimit: 100,
    users: [],
    recentLogins24h: [],
    aiUsageToday: [],
  };

  describe("churn group", () => {
    it("flags users with >= 7 active days who have been inactive for 3 to 30 days", () => {
      const input: AttentionInput = {
        ...baseInput,
        users: [
          // Match: 7 active days, 5 days inactive
          {
            id: "u1",
            displayName: "User Churn 1",
            createdAt: "2026-09-01T00:00:00Z",
            activeDays: 7,
            lastActiveDay: "2026-10-23", // 5 days ago
          },
          // Boundary match: 3 days inactive
          {
            id: "u2",
            displayName: "User Churn 2",
            createdAt: "2026-09-01T00:00:00Z",
            activeDays: 10,
            lastActiveDay: "2026-10-25", // 3 days ago
          },
          // Boundary match: 30 days inactive
          {
            id: "u3",
            displayName: "User Churn 3",
            createdAt: "2026-08-01T00:00:00Z",
            activeDays: 15,
            lastActiveDay: "2026-09-28", // 30 days ago
          },
          // Too recent: 2 days inactive -> not churn yet
          {
            id: "u4",
            displayName: "User Active",
            createdAt: "2026-09-01T00:00:00Z",
            activeDays: 8,
            lastActiveDay: "2026-10-26", // 2 days ago
          },
          // Too old: 31 days inactive -> completely abandoned
          {
            id: "u5",
            displayName: "User Lost",
            createdAt: "2026-08-01T00:00:00Z",
            activeDays: 8,
            lastActiveDay: "2026-09-27", // 31 days ago
          },
          // Not enough active days (< 7)
          {
            id: "u6",
            displayName: "User Casual",
            createdAt: "2026-09-01T00:00:00Z",
            activeDays: 6,
            lastActiveDay: "2026-10-23",
          },
        ],
      };

      const result = computeAttention(input);
      expect(result.churn.map((i) => i.userId)).toEqual(["u1", "u2", "u3"]);
    });
  });

  describe("stuck group", () => {
    it("flags accounts created >= 2 days ago with 0 active days", () => {
      const input: AttentionInput = {
        ...baseInput,
        users: [
          // Match: created 3 days ago, 0 active days
          {
            id: "u1",
            displayName: "Stuck User 1",
            createdAt: "2026-10-25T10:00:00Z",
            activeDays: 0,
            lastActiveDay: null,
          },
          // Boundary match: created 2 days ago, 0 active days
          {
            id: "u2",
            displayName: "Stuck User 2",
            createdAt: "2026-10-26T10:00:00Z",
            activeDays: 0,
            lastActiveDay: null,
          },
          // Not matched: brand new account (< 2 days)
          {
            id: "u3",
            displayName: "New User",
            createdAt: "2026-10-27T18:00:00Z",
            activeDays: 0,
            lastActiveDay: null,
          },
          // Not matched: has studied (activeDays > 0)
          {
            id: "u4",
            displayName: "Active Learner",
            createdAt: "2026-10-20T00:00:00Z",
            activeDays: 1,
            lastActiveDay: "2026-10-20",
          },
        ],
      };

      const result = computeAttention(input);
      expect(result.stuck.map((i) => i.userId)).toEqual(["u1", "u2"]);
    });
  });

  describe("multiCountry group", () => {
    it("flags users with >= 2 distinct countries in 24h", () => {
      const input: AttentionInput = {
        ...baseInput,
        users: [
          { id: "u1", displayName: "User 1", createdAt: "2026-10-01T00:00:00Z", activeDays: 5, lastActiveDay: "2026-10-28" },
          { id: "u2", displayName: "User 2", createdAt: "2026-10-01T00:00:00Z", activeDays: 5, lastActiveDay: "2026-10-28" },
        ],
        recentLogins24h: [
          { userId: "u1", country: "VN", city: "Hanoi", created_at: "2026-10-28T08:00:00Z" },
          { userId: "u1", country: "US", city: "New York", created_at: "2026-10-28T09:00:00Z" },
          // u2 only logged in from VN multiple times
          { userId: "u2", country: "VN", city: "Hanoi", created_at: "2026-10-28T08:00:00Z" },
          { userId: "u2", country: "VN", city: "Da Nang", created_at: "2026-10-28T10:00:00Z" },
        ],
      };

      const result = computeAttention(input);
      expect(result.multiCountry.map((i) => i.userId)).toEqual(["u1"]);
    });
  });

  describe("aiHeavy group", () => {
    it("flags users reaching >= 80% of daily AI limit", () => {
      const input: AttentionInput = {
        ...baseInput,
        aiLimit: 100,
        users: [
          { id: "u1", displayName: "AI Power User", createdAt: "2026-10-01T00:00:00Z", activeDays: 5, lastActiveDay: "2026-10-28" },
          { id: "u2", displayName: "AI Near Limit", createdAt: "2026-10-01T00:00:00Z", activeDays: 5, lastActiveDay: "2026-10-28" },
          { id: "u3", displayName: "AI Normal User", createdAt: "2026-10-01T00:00:00Z", activeDays: 5, lastActiveDay: "2026-10-28" },
        ],
        aiUsageToday: [
          { userId: "u1", requests: 95 }, // 95% -> matched
          { userId: "u2", requests: 80 }, // 80% -> matched
          { userId: "u3", requests: 79 }, // 79% -> not matched
        ],
      };

      const result = computeAttention(input);
      expect(result.aiHeavy.map((i) => i.userId)).toEqual(["u1", "u2"]);
    });
  });
});
