import { describe, expect, it } from "vitest";
import {
  DEFAULT_ROOM,
  isRoomItemId,
  ITEM_BY_ID,
  ITEMS,
  lockReason,
  ownedItems,
  resolveRoom,
  ROOM_SLOTS,
  tripItemsFor,
} from "@/lib/bin/catalog";

describe("bin catalog", () => {
  it("has unique ids and each id is <= 40 chars", () => {
    const ids = new Set<string>();
    for (const item of ITEMS) {
      expect(item.id.length).toBeLessThanOrEqual(40);
      expect(ids.has(item.id)).toBe(false);
      ids.add(item.id);
    }
    expect(ITEM_BY_ID.size).toBe(ITEMS.length);
  });

  it("has exactly one default item for each room slot", () => {
    for (const slot of ROOM_SLOTS) {
      const defaults = ITEMS.filter((item) => item.slot === slot && item.source.kind === "default");
      expect(defaults).toHaveLength(1);
      expect(DEFAULT_ROOM[slot]).toBe(defaults[0].id);
    }
  });

  it("every shop item has a price between 1 and 100", () => {
    const shopItems = ITEMS.filter((item) => item.source.kind === "shop");
    expect(shopItems.length).toBeGreaterThan(0);
    for (const item of shopItems) {
      if (item.source.kind === "shop") {
        expect(item.source.price).toBeGreaterThanOrEqual(1);
        expect(item.source.price).toBeLessThanOrEqual(100);
      }
    }
  });

  it("isRoomItemId checks presence correctly", () => {
    expect(isRoomItemId("bowl_basic")).toBe(true);
    expect(isRoomItemId("bowl_gold")).toBe(true);
    expect(isRoomItemId("nonexistent_item")).toBe(false);
  });

  it("ownedItems always includes defaults and items from rows", () => {
    const owned = ownedItems([{ item_id: "bowl_gold" }, { item_id: "rug_paw", qty: 1 }, { item_id: "rug_stripes", qty: 0 }]);
    expect(owned.has("bowl_basic")).toBe(true);
    expect(owned.has("bed_none")).toBe(true);
    expect(owned.has("bowl_gold")).toBe(true);
    expect(owned.has("rug_paw")).toBe(true);
    // qty 0 should not be owned
    expect(owned.has("rug_stripes")).toBe(false);
    expect(owned.has("wall_sun")).toBe(false);
  });

  it("resolveRoom drops unknown or unowned ids and slot mismatches", () => {
    const owned = new Set(["bowl_basic", "bed_none", "wall_none", "toy_none", "rug_basic", "corner_none", "bowl_gold"]);
    const room = resolveRoom(
      [
        { slot: "bowl", item_id: "bowl_gold" },
        { slot: "bed", item_id: "bed_cloud" }, // unowned
        { slot: "wall", item_id: "bowl_basic" }, // slot mismatch
        { slot: "unknown_slot", item_id: "bowl_gold" }, // unknown slot
      ],
      owned,
    );
    expect(room.bowl).toBe("bowl_gold");
    expect(room.bed).toBe("bed_none");
    expect(room.wall).toBe("wall_none");
    expect(room.rug).toBe("rug_basic");
  });

  it("lockReason formats level and streak correctly", () => {
    const goldBowl = ITEM_BY_ID.get("bowl_gold")!;
    expect(lockReason(goldBowl, { level: 5, longestStreak: 10 })).toBe("Cấp 8");
    expect(lockReason(goldBowl, { level: 8, longestStreak: 10 })).toBeNull();

    const rainbowRug = ITEM_BY_ID.get("rug_rainbow")!;
    expect(lockReason(rainbowRug, { level: 10, longestStreak: 10 })).toBe("Chuỗi 14 ngày");
    expect(lockReason(rainbowRug, { level: 10, longestStreak: 14 })).toBeNull();

    const basicBowl = ITEM_BY_ID.get("bowl_basic")!;
    expect(lockReason(basicBowl, { level: 1, longestStreak: 0 })).toBeNull();
  });

  it("tripItemsFor returns trip-only items not owned and matches language", () => {
    const owned = new Set(["bed_royal"]);
    const zhItems = tripItemsFor("zh", owned);
    expect(zhItems.some((item) => item.id === "corner_bus")).toBe(false); // bus is en
    expect(zhItems.some((item) => item.id === "toy_kite")).toBe(true); // kite is zh
    expect(zhItems.some((item) => item.id === "bed_royal")).toBe(false); // already owned
    expect(zhItems.some((item) => item.id === "wall_map")).toBe(true); // neutral lang trip item

    const enItems = tripItemsFor("en", owned);
    expect(enItems.some((item) => item.id === "corner_bus")).toBe(true);
    expect(enItems.some((item) => item.id === "toy_kite")).toBe(false);
  });
});
