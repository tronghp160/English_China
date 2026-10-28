import { describe, expect, it } from "vitest";
import {
  aggregatePlaces,
  bucketLevels,
  computeDauWauMau,
  filterAndSortUsers,
  flagLoginEvents,
  type UserFilterRow,
} from "@/lib/admin-monitor-utils";

describe("flagLoginEvents", () => {
  it("flags sequential new places and new devices, skipping the oldest", () => {
    // 3 events, passed in newest-first order
    const events = [
      {
        id: 3,
        city: "Đà Nẵng",
        country: "VN",
        device_type: "mobile",
        browser: "Safari",
        os: "iOS",
        created_at: "2026-10-28T12:00:00Z",
      },
      {
        id: 2,
        city: "Đà Nẵng",
        country: "VN",
        device_type: "desktop",
        browser: "Chrome",
        os: "Windows",
        created_at: "2026-10-27T12:00:00Z",
      },
      {
        id: 1, // oldest
        city: "Hà Nội",
        country: "VN",
        device_type: "desktop",
        browser: "Chrome",
        os: "Windows",
        created_at: "2026-10-26T12:00:00Z",
      },
    ];

    const flagged = flagLoginEvents(events);
    expect(flagged).toHaveLength(3);

    // Oldest (index 2): baseline, neither is new
    expect(flagged[2].newPlace).toBe(false);
    expect(flagged[2].newDevice).toBe(false);

    // Middle (index 1): Đà Nẵng is a new place; Chrome/Windows was already seen in event 1
    expect(flagged[1].newPlace).toBe(true);
    expect(flagged[1].newDevice).toBe(false);

    // Newest (index 0): Đà Nẵng already seen; Safari/iOS is a new device
    expect(flagged[0].newPlace).toBe(false);
    expect(flagged[0].newDevice).toBe(true);
  });
});

describe("aggregatePlaces", () => {
  it("groups events by place and sorts by count descending", () => {
    const events = [
      { city: "Hà Nội", region: "HN", country: "VN", created_at: "2026-10-28T10:00:00Z" },
      { city: "Đà Nẵng", region: "DN", country: "VN", created_at: "2026-10-27T10:00:00Z" },
      { city: "Hà Nội", region: "HN", country: "VN", created_at: "2026-10-26T10:00:00Z" },
    ];

    const places = aggregatePlaces(events);
    expect(places).toHaveLength(2);
    expect(places[0].city).toBe("Hà Nội");
    expect(places[0].count).toBe(2);
    expect(places[1].city).toBe("Đà Nẵng");
    expect(places[1].count).toBe(1);
  });
});

describe("filterAndSortUsers", () => {
  const users: UserFilterRow[] = [
    {
      id: "u1",
      email: "alice@example.com",
      displayName: "Alice Tran",
      username: "alice",
      createdAt: "2026-10-25T10:00:00Z",
      isBanned: false,
      isAdmin: false,
      lastSeenAt: "2026-10-28T14:00:00Z",
      status: "online",
      totalXp: 500, // Level 5
      activeDays: 10,
      lastActiveDay: "2026-10-28",
    },
    {
      id: "u2",
      email: "bob@example.com",
      displayName: "Bob Le",
      username: "bob",
      createdAt: "2026-10-10T10:00:00Z",
      isBanned: true,
      isAdmin: false,
      lastSeenAt: "2026-10-20T10:00:00Z",
      status: "offline",
      totalXp: 150, // Level 3
      activeDays: 5,
      lastActiveDay: "2026-10-15",
    },
    {
      id: "u3",
      email: "admin@example.com",
      displayName: "Admin Master",
      username: "admin",
      createdAt: "2026-10-01T10:00:00Z",
      isBanned: false,
      isAdmin: true,
      lastSeenAt: null,
      status: "never",
      totalXp: 0,
      activeDays: 0,
      lastActiveDay: null,
    },
  ];

  it("filters by query string", () => {
    const res = filterAndSortUsers(users, { q: "bob" });
    expect(res).toHaveLength(1);
    expect(res[0].id).toBe("u2");
  });

  it("filters by status", () => {
    expect(filterAndSortUsers(users, { status: "online" })).toHaveLength(1);
    expect(filterAndSortUsers(users, { status: "banned" })).toHaveLength(1);
    expect(filterAndSortUsers(users, { status: "admin" })).toHaveLength(1);
    expect(filterAndSortUsers(users, { status: "unstudied" })).toHaveLength(1);
  });

  it("sorts by level descending", () => {
    const res = filterAndSortUsers(users, { sort: "level" });
    expect(res[0].id).toBe("u1"); // 500 XP
    expect(res[1].id).toBe("u2"); // 150 XP
    expect(res[2].id).toBe("u3"); // 0 XP
  });

  it("sorts by lastSeen descending", () => {
    const res = filterAndSortUsers(users, { sort: "lastSeen" });
    expect(res[0].id).toBe("u1");
    expect(res[1].id).toBe("u2");
    expect(res[2].id).toBe("u3"); // null lastSeenAt last
  });
});

describe("bucketLevels & computeDauWauMau", () => {
  it("counts users in level buckets", () => {
    const users = [
      { totalXp: 0 }, // lvl 1
      { totalXp: 50 }, // lvl 2
      { totalXp: 150 }, // lvl 3
      { totalXp: 500 }, // lvl 5
      { totalXp: 2250 }, // lvl 10
    ];
    const buckets = bucketLevels(users);
    expect(buckets["1-2"]).toBe(2);
    expect(buckets["3-4"]).toBe(1);
    expect(buckets["5-9"]).toBe(1);
    expect(buckets["10+"]).toBe(1);
  });

  it("computes DAU, WAU, and MAU correctly", () => {
    const rows = [
      { user_id: "u1", day: "2026-10-28" },
      { user_id: "u2", day: "2026-10-28" },
      { user_id: "u3", day: "2026-10-25" }, // in 7-day window
      { user_id: "u4", day: "2026-10-05" }, // in 30-day window
      { user_id: "u5", day: "2026-09-01" }, // older than 30 days
    ];
    const res = computeDauWauMau(rows, "2026-10-28");
    expect(res.dau).toBe(2); // u1, u2
    expect(res.wau).toBe(3); // u1, u2, u3
    expect(res.mau).toBe(4); // u1, u2, u3, u4
  });
});
