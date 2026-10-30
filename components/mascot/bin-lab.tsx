"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { DEFAULT_ROOM, ITEMS, ROOM_SLOTS, SLOT_LABEL, type RoomSlot } from "@/lib/bin/catalog";
import { BIN_ACTION_NAMES, PUP_MOODS, type BinAction } from "@/lib/mascot/lines";
import { OUTFITS } from "@/lib/progress";
import { cn } from "@/lib/utils";
import { BinRoom } from "./bin-room";
import { Buddy } from "./buddy";
import { Egg } from "./egg";
import { OutfitIcon } from "./outfits";
import { Pup } from "./pup";
import { useBinAction } from "./use-bin";
import { BUDDY_SPECIES, buddyBySpecies, type BuddySpecies } from "@/lib/bin/buddies";

/** Everything about Bin in one place for the dev-only /dev-ui/bin page: moods, outfits, actions, looking, reduced motion. */
export function BinLab() {
  const [outfit, setOutfit] = useState("none");
  const [reduced, setReduced] = useState(false);
  const [follow, setFollow] = useState(true);
  const [size, setSize] = useState(200);
  const [labRoom, setLabRoom] = useState<Record<RoomSlot, string>>(DEFAULT_ROOM);
  const [labNight, setLabNight] = useState(false);
  const [eggTapCount, setEggTapCount] = useState<Record<BuddySpecies, number>>({
    miu: 0,
    panda: 0,
    duck: 0,
    bunny: 0,
  });
  const bin = useBinAction("happy", { reduced });

  return (
    <div className="space-y-10 pb-24" data-sim-reduced={reduced ? "" : undefined}>
      <div className="flex flex-wrap items-center gap-3">
        <h1 className="text-2xl">Bin 2.0</h1>
        <Button size="sm" variant={reduced ? "default" : "outline"} onClick={() => setReduced((r) => !r)} aria-pressed={reduced}>
          Giả lập giảm chuyển động
        </Button>
        <Button size="sm" variant={follow ? "default" : "outline"} onClick={() => setFollow((f) => !f)} aria-pressed={follow}>
          Nhìn theo chuột
        </Button>
        {[96, 140, 200, 280].map((s) => (
          <Button key={s} size="sm" variant={size === s ? "default" : "outline"} onClick={() => setSize(s)}>
            {s}px
          </Button>
        ))}
      </div>

      <section className="grid gap-6 lg:grid-cols-[auto_1fr]">
        <div className="mx-auto grid place-items-center rounded-xl bg-primary-soft p-8" style={{ minWidth: size + 64 }}>
          <Pup
            mood={bin.mood}
            action={bin.action}
            outfit={outfit}
            size={size}
            follow={follow}
            animated={!reduced}
          />
        </div>
        <div className="space-y-4">
          <div>
            <h2 className="mb-2 text-lg">Hành động ({BIN_ACTION_NAMES.length})</h2>
            <div className="flex flex-wrap gap-2">
              {BIN_ACTION_NAMES.map((a: BinAction) => (
                <Button key={a} size="sm" variant="outline" onClick={() => bin.play(a)}>
                  {a}
                </Button>
              ))}
              <Button size="sm" variant="soft" tone="coral" onClick={bin.clear}>
                clear
              </Button>
            </div>
            <p className="mt-2 text-sm text-fg-muted">
              Hiện tại: {bin.action ?? "không có"} · khuôn mặt: {bin.mood}
            </p>
          </div>
          <div>
            <h2 className="mb-2 text-lg">Trang phục</h2>
            <div className="flex flex-wrap gap-2">
              {OUTFITS.map((o) => (
                <button
                  key={o.id}
                  type="button"
                  aria-label={o.name}
                  aria-pressed={outfit === o.id}
                  onClick={() => setOutfit(o.id)}
                  className={cn(
                    "grid size-16 place-items-center rounded-lg border-2",
                    outfit === o.id ? "border-primary bg-primary-soft" : "border-border bg-surface",
                  )}
                >
                  <OutfitIcon outfit={o.id} size={36} />
                </button>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section>
        <h2 className="mb-3 text-lg">Biểu cảm × trang phục hiện tại</h2>
        <div className="grid grid-cols-3 gap-4 sm:grid-cols-5">
          {PUP_MOODS.map((m) => (
            <div key={m} className="flex flex-col items-center gap-1 rounded-lg bg-surface p-3 text-xs font-semibold text-fg-muted shadow-sm">
              <Pup mood={m} size={96} outfit={outfit} animated={false} />
              {m}
            </div>
          ))}
        </div>
      </section>

      <section>
        <h2 className="mb-3 text-lg">Mọi trang phục (mood happy)</h2>
        <div className="grid grid-cols-4 gap-4 sm:grid-cols-8">
          {OUTFITS.map((o) => (
            <div key={o.id} className="flex flex-col items-center gap-1 rounded-lg bg-surface p-2 text-xs font-semibold text-fg-muted shadow-sm">
              <Pup mood="happy" size={96} outfit={o.id} animated={false} />
              {o.name}
            </div>
          ))}
        </div>
      </section>

      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg">Phòng của Bin</h2>
          <Button size="sm" variant="outline" onClick={() => setLabNight((n) => !n)}>
            Chế độ: {labNight ? "Đêm" : "Ngày"}
          </Button>
        </div>
        <div className="relative mx-auto h-[270px] w-full max-w-[500px] overflow-hidden rounded-[24px] bg-scene-wall lg:h-[360px]">
          <BinRoom night={labNight} name="BIN" room={labRoom} />
          <div className="absolute bottom-[26px] left-1/2 -ml-[85px] lg:-ml-[110px]">
            <Pup mood={bin.mood} action={bin.action} outfit={outfit} size={170} className="size-[170px] lg:size-[220px]" />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
          {ROOM_SLOTS.map((slot) => {
            const slotItems = ITEMS.filter((item) => item.slot === slot);
            return (
              <div key={slot} className="flex flex-col gap-1 text-xs">
                <span className="font-bold text-fg-muted">{SLOT_LABEL[slot]}</span>
                <select
                  aria-label={SLOT_LABEL[slot]}
                  className="rounded-md border border-border bg-surface p-1.5 text-xs font-medium text-fg"
                  value={labRoom[slot]}
                  onChange={(e) => setLabRoom((r) => ({ ...r, [slot]: e.target.value }))}
                >
                  {slotItems.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.name}
                    </option>
                  ))}
                </select>
              </div>
            );
          })}
        </div>
      </section>

      {/* Companions & Eggs Section */}
      <section className="space-y-6">
        <div>
          <h2 className="text-lg font-bold">Bạn nhỏ cùng nhà (4 loài × 3 cảm xúc)</h2>
          <p className="text-sm text-fg-muted">
            Vẽ cùng phong cách Bin: nét viền mực, má hồng, mắt chấm nhấp nháy, tỉ lệ hài hòa khi đứng cạnh Bin.
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {BUDDY_SPECIES.map((sp) => {
            const def = buddyBySpecies(sp)!;
            return (
              <div key={sp} className="rounded-xl border border-border bg-surface p-4 shadow-sm">
                <div className="mb-3 flex items-center justify-between">
                  <h3 className="font-bold">{def.defaultName}</h3>
                  <span className="text-xs text-fg-muted">loài: {sp}</span>
                </div>
                <div className="grid grid-cols-3 gap-2 text-center text-xs text-fg-muted">
                  <div className="flex flex-col items-center gap-1 rounded-lg bg-surface-2 p-2">
                    <Buddy species={sp} mood="happy" size={64} />
                    <span>Vui</span>
                  </div>
                  <div className="flex flex-col items-center gap-1 rounded-lg bg-surface-2 p-2">
                    <Buddy species={sp} mood="sleepy" size={64} />
                    <span>Ngủ</span>
                  </div>
                  <div className="flex flex-col items-center gap-1 rounded-lg bg-surface-2 p-2">
                    <Buddy species={sp} mood="cheer" size={64} />
                    <span>Reo</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Side-by-side with Bin */}
        <div className="rounded-xl border border-border bg-surface p-4 shadow-sm">
          <h3 className="mb-3 font-bold">So sánh cạnh Bin (kích thước cùng bộ)</h3>
          <div className="flex flex-wrap items-end justify-around gap-4 rounded-lg bg-surface-2 p-4">
            <div className="flex flex-col items-center gap-1 text-xs">
              <Pup mood="happy" size={72} animated={false} />
              <span className="font-semibold text-fg">Bin</span>
            </div>
            {BUDDY_SPECIES.map((sp) => {
              const def = buddyBySpecies(sp)!;
              return (
                <div key={sp} className="flex flex-col items-center gap-1 text-xs">
                  <Buddy species={sp} mood="happy" size={60} />
                  <span className="text-fg-muted">{def.defaultName}</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Eggs Section */}
        <div>
          <h2 className="text-lg font-bold">Trứng của bạn nhỏ (4 loài × 3 mức nứt)</h2>
          <p className="text-sm text-fg-muted">
            Trứng mang hoa văn đặc trưng từng loài; nứt dần theo số câu đúng; lắc lư khi sẵn sàng nở (bấm vào trứng sẵn sàng để chạm thử).
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {BUDDY_SPECIES.map((sp) => {
            const def = buddyBySpecies(sp)!;
            const taps = eggTapCount[sp];
            return (
              <div key={sp} className="rounded-xl border border-border bg-surface p-4 shadow-sm">
                <div className="mb-3 flex items-center justify-between">
                  <h3 className="font-bold">Trứng {def.defaultName}</h3>
                  <span className="text-xs text-fg-muted">chạm: {taps} lần</span>
                </div>
                <div className="grid grid-cols-3 gap-2 text-center text-xs text-fg-muted">
                  <div className="flex flex-col items-center gap-1 rounded-lg bg-surface-2 p-2">
                    <Egg species={sp} progress={0} size={48} />
                    <span>Mới nhận</span>
                  </div>
                  <div className="flex flex-col items-center gap-1 rounded-lg bg-surface-2 p-2">
                    <Egg species={sp} progress={0.5} size={48} />
                    <span>Đang nứt</span>
                  </div>
                  <div className="flex flex-col items-center gap-1 rounded-lg bg-surface-2 p-2">
                    <Egg
                      species={sp}
                      progress={1}
                      ready
                      size={48}
                      onTap={() => setEggTapCount((prev) => ({ ...prev, [sp]: prev[sp] + 1 }))}
                    />
                    <span className="font-semibold text-c-coral-fg">Sẵn sàng!</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}
