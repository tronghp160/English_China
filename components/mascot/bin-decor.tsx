"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Bone, ChevronLeft, Lock, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { fireConfetti } from "@/components/fx/confetti";
import { buyItem, placeItem } from "@/lib/actions/bin";
import {
  ITEMS,
  lockReason,
  ROOM_SLOTS,
  SLOT_LABEL,
  STREAK_SCARF,
  type RoomItem,
  type RoomSlot,
} from "@/lib/bin/catalog";
import { haptic } from "@/lib/haptics";
import type { BinAction, LineKey } from "@/lib/mascot/lines";
import { playSfx } from "@/lib/sfx";
import { cn } from "@/lib/utils";
import { OutfitIcon } from "./outfits";
import { RoomItemIcon } from "./room-items";

export function BinDecor({
  bones,
  level,
  longestStreak,
  room,
  owned,
  scarves = 0,
  name = "Bin",
  initialSlot = "bowl",
  onBonesChange,
  onRoomChange,
  onOwnedAdd,
  onScarvesChange,
  onPreview,
  onBack,
  playBin,
  speak,
  dueCount,
  onCloseHome,
}: {
  bones: number;
  level: number;
  longestStreak: number;
  room: Record<RoomSlot, string>;
  owned: Set<string>;
  scarves?: number;
  name?: string;
  initialSlot?: RoomSlot | "special";
  onBonesChange: (bones: number) => void;
  onRoomChange: (room: Record<RoomSlot, string>) => void;
  onOwnedAdd: (itemId: string) => void;
  onScarvesChange?: (scarves: number) => void;
  onPreview: (preview: { slot: RoomSlot; itemId: string } | null) => void;
  onBack: () => void;
  playBin: (action: BinAction) => void;
  speak: (key: LineKey) => void;
  dueCount: number;
  onCloseHome: () => void;
}) {
  const [activeSlot, setActiveSlot] = useState<RoomSlot | "special">(initialSlot);
  const [prevInitialSlot, setPrevInitialSlot] = useState(initialSlot);
  if (initialSlot !== prevInitialSlot) {
    setPrevInitialSlot(initialSlot);
    setActiveSlot(initialSlot);
  }
  const [selectedItem, setSelectedItem] = useState<RoomItem | null>(null);
  const [confirmBuy, setConfirmBuy] = useState(false);
  const [busy, setBusy] = useState(false);
  const confirmTimer = useRef<ReturnType<typeof setTimeout>>(undefined);

  useEffect(() => () => clearTimeout(confirmTimer.current), []);

  const itemsForSlot = activeSlot === "special" ? [] : ITEMS.filter((item) => item.slot === activeSlot);

  function handleSelectSlot(slot: RoomSlot | "special") {
    setActiveSlot(slot);
    setSelectedItem(null);
    onPreview(null);
    setConfirmBuy(false);
    clearTimeout(confirmTimer.current);
  }

  function handleSelectItem(item: RoomItem) {
    setSelectedItem(item);
    setConfirmBuy(false);
    clearTimeout(confirmTimer.current);
    onPreview({ slot: item.slot, itemId: item.id });
    playBin("sniff");
    speak("decorPreview");
    setTimeout(() => {
      playBin("nod");
    }, 600);
  }

  async function handlePlace(item: RoomItem) {
    if (busy) return;
    setBusy(true);
    const beforeRoom = { ...room };
    onRoomChange({ ...room, [item.slot]: item.id });
    onPreview(null);
    playBin("spin");
    speak("decorPlaced");
    playSfx("pop");
    haptic("light");

    const res = await placeItem({ slot: item.slot, itemId: item.id });
    setBusy(false);
    if (!res.ok) {
      onRoomChange(beforeRoom);
      toast.error(res.error);
    }
  }

  async function handleBuy(item: RoomItem) {
    if (busy) return;
    if (item.source.kind !== "shop") return;

    if (!confirmBuy) {
      setConfirmBuy(true);
      clearTimeout(confirmTimer.current);
      confirmTimer.current = setTimeout(() => {
        setConfirmBuy(false);
      }, 2000);
      return;
    }

    setBusy(true);
    clearTimeout(confirmTimer.current);
    setConfirmBuy(false);

    const price = item.source.price;
    const beforeBones = bones;
    const beforeRoom = { ...room };

    onBonesChange(Math.max(0, bones - price));
    onOwnedAdd(item.id);
    onRoomChange({ ...room, [item.slot]: item.id });
    onPreview(null);

    const res = await buyItem(item.id);
    if (!res.ok) {
      setBusy(false);
      onBonesChange(beforeBones);
      onRoomChange(beforeRoom);
      toast.error(res.error);
      return;
    }

    onBonesChange(res.data.bones);
    void fireConfetti("small");
    playBin("dance");
    speak("decorBought");
    playSfx("pop");
    haptic("success");

    // Auto-place into room
    const placeRes = await placeItem({ slot: item.slot, itemId: item.id });
    setBusy(false);
    if (!placeRes.ok) {
      onRoomChange(beforeRoom);
      toast.error(placeRes.error);
    }
  }

  async function handleBuyScarf() {
    if (busy) return;
    if (scarves >= STREAK_SCARF.maxQty) return;

    if (!confirmBuy) {
      setConfirmBuy(true);
      clearTimeout(confirmTimer.current);
      confirmTimer.current = setTimeout(() => {
        setConfirmBuy(false);
      }, 2000);
      return;
    }

    setBusy(true);
    clearTimeout(confirmTimer.current);
    setConfirmBuy(false);

    const price = STREAK_SCARF.price;
    const beforeBones = bones;
    const beforeScarves = scarves;

    onBonesChange(Math.max(0, bones - price));
    onScarvesChange?.(scarves + 1);

    const res = await buyItem("streak_scarf");
    setBusy(false);
    if (!res.ok) {
      onBonesChange(beforeBones);
      onScarvesChange?.(beforeScarves);
      toast.error(res.error);
      return;
    }

    onBonesChange(res.data.bones);
    void fireConfetti("small");
    playBin("dance");
    speak("decorBought");
    playSfx("pop");
    haptic("success");
    toast.success("Đã mua Khăn giữ chuỗi!");
  }

  const goStudy = dueCount > 0 ? "/review" : "/practice";

  return (
    <div data-busy={busy ? "" : undefined} className="flex flex-col gap-4">
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => {
            onPreview(null);
            onBack();
          }}
          aria-label="Quay lại"
          className="grid size-11 shrink-0 place-items-center rounded-full bg-surface-2 text-fg-muted transition-colors hover:bg-surface-3 active:scale-95"
        >
          <ChevronLeft className="size-5" aria-hidden />
        </button>
        <h2 className="text-lg font-bold">Trang trí phòng</h2>
      </div>

      {/* Slot selector chips */}
      <div className="flex gap-1.5 overflow-x-auto pb-1" role="tablist" aria-label="Khu vực phòng">
        {ROOM_SLOTS.map((slot) => {
          const selected = activeSlot === slot;
          return (
            <button
              key={slot}
              type="button"
              role="tab"
              aria-selected={selected}
              onClick={() => handleSelectSlot(slot)}
              className={cn(
                "min-h-11 shrink-0 rounded-full px-4 text-sm font-bold transition-colors",
                selected ? "bg-primary-soft text-primary-fg" : "bg-surface-2 text-fg-muted hover:bg-surface-3",
              )}
            >
              {SLOT_LABEL[slot]}
            </button>
          );
        })}
        <button
          type="button"
          role="tab"
          aria-selected={activeSlot === "special"}
          onClick={() => handleSelectSlot("special")}
          className={cn(
            "inline-flex min-h-11 shrink-0 items-center gap-1.5 rounded-full px-4 text-sm font-bold transition-colors",
            activeSlot === "special" ? "bg-primary-soft text-primary-fg" : "bg-surface-2 text-fg-muted hover:bg-surface-3",
          )}
        >
          <Sparkles className="size-4" aria-hidden />
          Đặc biệt
        </button>
      </div>

      {/* Special items tab */}
      {activeSlot === "special" ? (
        <div className="flex flex-col gap-3">
          <div className="flex flex-col sm:flex-row items-center gap-4 rounded-xl border border-border bg-surface p-4 shadow-sm">
            <div className="grid size-20 shrink-0 place-items-center rounded-xl bg-c-blue-soft text-c-blue-fg p-2">
              <OutfitIcon outfit="scarf" size={48} />
            </div>
            <div className="flex min-w-0 flex-1 flex-col gap-1 text-center sm:text-left">
              <div className="flex items-center justify-center sm:justify-start gap-2">
                <h3 className="text-base font-bold text-fg">{STREAK_SCARF.name}</h3>
                <span className="rounded-full bg-surface-2 px-2.5 py-0.5 text-xs font-semibold text-fg-muted">
                  Đang có {scarves}/2
                </span>
              </div>
              <p className="text-xs text-fg-muted leading-relaxed">
                Lỡ một ngày, {name} quàng khăn giữ chuỗi cho bạn. Giữ được tối đa 2 cái.
              </p>
            </div>
            <div className="shrink-0">
              {scarves >= 2 ? (
                <button
                  type="button"
                  disabled
                  className="min-h-11 rounded-full bg-surface-2 px-4 text-sm font-bold text-fg-muted"
                >
                  Đã có đủ 2 khăn
                </button>
              ) : bones < STREAK_SCARF.price ? (
                <div className="flex flex-col items-center gap-1">
                  <button
                    type="button"
                    disabled
                    className="inline-flex min-h-11 items-center gap-1.5 rounded-full bg-surface-2 px-4 text-sm font-bold text-fg-muted"
                  >
                    <Bone className="size-4" aria-hidden />
                    Mua · {STREAK_SCARF.price} xương
                  </button>
                  <Link
                    href={goStudy}
                    onClick={onCloseHome}
                    className="text-xs font-bold text-primary underline underline-offset-2"
                  >
                    Kiếm thêm xương
                  </Link>
                </div>
              ) : (
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => void handleBuyScarf()}
                  className={cn(
                    "inline-flex min-h-11 items-center gap-1.5 rounded-full px-5 text-sm font-bold transition-all active:scale-95",
                    confirmBuy
                      ? "bg-primary text-white shadow-md animate-pulse"
                      : "bg-primary text-white hover:bg-primary-hover shadow-sm",
                  )}
                >
                  <Bone className="size-4" aria-hidden />
                  {confirmBuy ? "Chắc chắn mua? (20 xương)" : `Mua · ${STREAK_SCARF.price} xương`}
                </button>
              )}
            </div>
          </div>
        </div>
      ) : (
        /* Grid of room items */
        <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
          {itemsForSlot.map((item) => {
            const isPlaced = room[activeSlot] === item.id;
            const isOwned = owned.has(item.id);
            const isSelected = selectedItem?.id === item.id;
            const lock = lockReason(item, { level, longestStreak });
            const isTripUnowned = item.source.kind === "trip" && !isOwned;

            return (
              <button
                key={item.id}
                type="button"
                aria-label={item.name}
                aria-pressed={isSelected}
                onClick={() => handleSelectItem(item)}
                className={cn(
                  "relative flex h-[84px] w-full flex-col items-center justify-between rounded-md border-2 p-1.5 transition-colors active:scale-95",
                  isSelected
                    ? "border-primary bg-primary-soft/40"
                    : isPlaced
                      ? "border-primary/60 bg-surface"
                      : "border-border bg-surface hover:bg-surface-2",
                  isTripUnowned && "opacity-60 grayscale",
                )}
              >
                <div className="grid flex-1 place-items-center">
                  <RoomItemIcon id={item.id} size={36} />
                </div>
                <div className="w-full text-center text-[0.6875rem] leading-tight font-bold">
                  {isPlaced ? (
                    <span className="text-primary-fg">Đang dùng</span>
                  ) : isOwned ? (
                    <span className="text-fg-muted">Đã có</span>
                  ) : lock ? (
                    <span className="inline-flex items-center justify-center gap-0.5 text-fg-muted">
                      <Lock className="size-3" aria-hidden />
                      {lock}
                    </span>
                  ) : item.source.kind === "shop" ? (
                    <span className="inline-flex items-center justify-center gap-1 text-c-sun-fg">
                      <Bone className="size-3" aria-hidden />
                      {item.source.price}
                    </span>
                  ) : (
                    <span className="text-fg-muted">Đi dạo</span>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      )}

      {/* Action bar for selected item */}
      {selectedItem && activeSlot !== "special" && (
        <div className="mt-2 flex flex-col gap-2 rounded-xl bg-surface-2 p-3">
          <div className="flex items-center justify-between">
            <span className="text-sm font-bold text-fg">{selectedItem.name}</span>
            {selectedItem.source.kind === "shop" && !owned.has(selectedItem.id) && (
              <span className="inline-flex items-center gap-1 text-sm font-extrabold text-c-sun-fg">
                <Bone className="size-4" aria-hidden />
                {selectedItem.source.price} xương
              </span>
            )}
          </div>

          {room[activeSlot] === selectedItem.id ? (
            <span className="text-center text-xs font-semibold text-fg-muted">Món này đang được đặt trong phòng.</span>
          ) : owned.has(selectedItem.id) ? (
            <button
              type="button"
              disabled={busy}
              onClick={() => void handlePlace(selectedItem)}
              className="inline-flex min-h-11 w-full items-center justify-center rounded-full bg-primary px-5 text-sm font-bold text-on-primary shadow-primary transition-transform active:scale-95 disabled:opacity-60"
            >
              Đặt vào phòng
            </button>
          ) : lockReason(selectedItem, { level, longestStreak }) ? (
            <span className="text-center text-xs font-semibold text-fg-muted">
              Chưa mở khóa: {lockReason(selectedItem, { level, longestStreak })}
            </span>
          ) : selectedItem.source.kind === "shop" ? (
            bones >= selectedItem.source.price ? (
              <button
                type="button"
                disabled={busy}
                onClick={() => void handleBuy(selectedItem)}
                className="inline-flex min-h-11 w-full items-center justify-center rounded-full bg-primary px-5 text-sm font-bold text-on-primary shadow-primary transition-transform active:scale-95 disabled:opacity-60"
              >
                {confirmBuy ? "Chắc chắn mua?" : `Mua · ${selectedItem.source.price} xương`}
              </button>
            ) : (
              <div className="flex flex-col items-center gap-1.5">
                <button
                  type="button"
                  disabled
                  className="inline-flex min-h-11 w-full items-center justify-center rounded-full bg-surface-3 px-5 text-sm font-bold text-fg-muted"
                >
                  Còn thiếu {selectedItem.source.price - bones} xương
                </button>
                <Link
                  href={goStudy}
                  onClick={onCloseHome}
                  className="text-xs font-bold text-primary underline underline-offset-2"
                >
                  Đi học
                </Link>
              </div>
            )
          ) : (
            <span className="text-center text-xs font-semibold text-fg-muted">Món này chỉ có thể nhận được khi Bin đi dạo về.</span>
          )}
        </div>
      )}
    </div>
  );
}
