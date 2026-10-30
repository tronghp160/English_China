import type { LangCode } from "@/lib/lang/types";

export type RoomSlot = "bowl" | "bed" | "wall" | "toy" | "rug" | "corner";
export const ROOM_SLOTS: readonly RoomSlot[] = ["bowl", "bed", "wall", "toy", "rug", "corner"];
export const SLOT_LABEL: Record<RoomSlot, string> = {
  bowl: "Bát ăn",
  bed: "Nệm",
  wall: "Tranh",
  toy: "Đồ chơi",
  rug: "Thảm",
  corner: "Góc phòng",
};

export type ItemSource =
  | { kind: "default" }
  | { kind: "shop"; price: number; level?: number; streak?: number }
  | { kind: "trip" };

export type RoomItem = {
  id: string;
  slot: RoomSlot;
  name: string;
  source: ItemSource;
  lang?: LangCode;
};

export const ITEMS: readonly RoomItem[] = [
  // bowl
  { id: "bowl_basic", slot: "bowl", name: "Bát đỏ", source: { kind: "default" } },
  { id: "bowl_blue", slot: "bowl", name: "Bát xanh", source: { kind: "shop", price: 8 } },
  { id: "bowl_bamboo", slot: "bowl", name: "Bát tre", source: { kind: "shop", price: 15 } },
  { id: "bowl_gold", slot: "bowl", name: "Bát vàng", source: { kind: "shop", price: 40, level: 8 } },

  // bed
  { id: "bed_none", slot: "bed", name: "(Không có nệm)", source: { kind: "default" } },
  { id: "bed_cushion", slot: "bed", name: "Đệm tròn", source: { kind: "shop", price: 12 } },
  { id: "bed_basket", slot: "bed", name: "Giỏ mây", source: { kind: "shop", price: 20 } },
  { id: "bed_cloud", slot: "bed", name: "Nệm mây", source: { kind: "shop", price: 35, level: 6 } },
  { id: "bed_royal", slot: "bed", name: "Nệm hoàng gia", source: { kind: "trip" } },

  // wall
  { id: "wall_none", slot: "wall", name: "(Tường trống)", source: { kind: "default" } },
  { id: "wall_sun", slot: "wall", name: "Tranh mặt trời", source: { kind: "shop", price: 10 } },
  { id: "wall_bone", slot: "wall", name: "Tranh khúc xương", source: { kind: "shop", price: 10 } },
  { id: "wall_hanzi", slot: "wall", name: "Thư pháp chữ 学", source: { kind: "shop", price: 18 } },
  { id: "wall_map", slot: "wall", name: "Bản đồ thế giới", source: { kind: "trip" } },

  // toy
  { id: "toy_none", slot: "toy", name: "(Không có)", source: { kind: "default" } },
  { id: "toy_yarn", slot: "toy", name: "Cuộn len", source: { kind: "shop", price: 6 } },
  { id: "toy_duck", slot: "toy", name: "Vịt cao su", source: { kind: "shop", price: 10 } },
  { id: "toy_frisbee", slot: "toy", name: "Đĩa bay", source: { kind: "shop", price: 14 } },
  { id: "toy_kite", slot: "toy", name: "Diều rồng", source: { kind: "trip" }, lang: "zh" },

  // rug
  { id: "rug_basic", slot: "rug", name: "Thảm xanh", source: { kind: "default" } },
  { id: "rug_stripes", slot: "rug", name: "Thảm sọc", source: { kind: "shop", price: 12 } },
  { id: "rug_paw", slot: "rug", name: "Thảm dấu chân", source: { kind: "shop", price: 18 } },
  { id: "rug_rainbow", slot: "rug", name: "Thảm cầu vồng", source: { kind: "shop", price: 30, streak: 14 } },

  // corner
  { id: "corner_none", slot: "corner", name: "(Trống)", source: { kind: "default" } },
  { id: "corner_cactus", slot: "corner", name: "Xương rồng", source: { kind: "shop", price: 8 } },
  { id: "corner_monstera", slot: "corner", name: "Cây trầu bà", source: { kind: "shop", price: 15 } },
  { id: "corner_lantern", slot: "corner", name: "Đèn lồng đỏ", source: { kind: "trip" }, lang: "zh" },
  { id: "corner_bus", slot: "corner", name: "Xe buýt đỏ mini", source: { kind: "trip" }, lang: "en" },
];

export const ITEM_BY_ID: ReadonlyMap<string, RoomItem> = new Map(ITEMS.map((item) => [item.id, item]));

export const DEFAULT_ROOM: Record<RoomSlot, string> = {
  bowl: "bowl_basic",
  bed: "bed_none",
  wall: "wall_none",
  toy: "toy_none",
  rug: "rug_basic",
  corner: "corner_none",
};

export function isRoomItemId(id: string): boolean {
  return ITEM_BY_ID.has(id);
}

/** Owned = defaults + rows of bin_items (with qty > 0 if qty is present). */
export function ownedItems(rows: { item_id: string; qty?: number }[]): Set<string> {
  const set = new Set<string>();
  for (const item of ITEMS) {
    if (item.source.kind === "default") {
      set.add(item.id);
    }
  }
  for (const row of rows) {
    if (row.qty === undefined || row.qty > 0) {
      if (ITEM_BY_ID.has(row.item_id)) {
        set.add(row.item_id);
      }
    }
  }
  return set;
}

/** Why a shop item can't be bought yet, or null. Same wording style as outfitCondition: "Cấp 8", "Chuỗi 14 ngày". */
export function lockReason(item: RoomItem, input: { level: number; longestStreak: number }): string | null {
  if (item.source.kind !== "shop") return null;
  if (item.source.level !== undefined && input.level < item.source.level) {
    return `Cấp ${item.source.level}`;
  }
  if (item.source.streak !== undefined && input.longestStreak < item.source.streak) {
    return `Chuỗi ${item.source.streak} ngày`;
  }
  return null;
}

/** The room as stored, with defaults for empty slots and unknown/unowned ids dropped. */
export function resolveRoom(rows: { slot: string; item_id: string }[], owned: Set<string>): Record<RoomSlot, string> {
  const room = { ...DEFAULT_ROOM };
  for (const row of rows) {
    if (ROOM_SLOTS.includes(row.slot as RoomSlot)) {
      const item = ITEM_BY_ID.get(row.item_id);
      if (item && item.slot === row.slot && owned.has(row.item_id)) {
        room[row.slot as RoomSlot] = row.item_id;
      }
    }
  }
  return room;
}

/** Trip-only items for a language that the user does not own yet. */
export function tripItemsFor(lang: LangCode, owned: Set<string>): RoomItem[] {
  return ITEMS.filter((item) => {
    if (item.source.kind !== "trip") return false;
    if (item.lang && item.lang !== lang) return false;
    return !owned.has(item.id);
  });
}
