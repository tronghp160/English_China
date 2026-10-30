"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Bone, ChevronLeft, Footprints, Sparkles, Volume2 } from "lucide-react";
import { toast } from "sonner";
import { fireConfetti } from "@/components/fx/confetti";
import { CountUp } from "@/components/fx/count-up";
import { IconTile } from "@/components/ui/icon-tile";
import { placeItem } from "@/lib/actions/bin";
import { collectTrip, startTrip, type TripView } from "@/lib/actions/bin-trip";
import { ITEM_BY_ID, type RoomSlot } from "@/lib/bin/catalog";
import { placeById } from "@/lib/bin/places";
import { haptic } from "@/lib/haptics";
import type { BinAction } from "@/lib/mascot/lines";
import { playSfx } from "@/lib/sfx";
import { speak as speakTts, ttsSupported } from "@/lib/tts";
import { Postcard } from "./postcard";
import { RoomItemIcon } from "./room-items";

export function BinTrip({
  name,
  dueCount,
  initialTrip,
  timezone = "Asia/Ho_Chi_Minh",
  onBack,
  onBonesChange,
  onRoomChange,
  onCloseHome,
  playBin,
}: {
  name: string;
  dueCount: number;
  initialTrip: TripView;
  timezone?: string;
  onBack: () => void;
  onBonesChange: (bones: number) => void;
  onRoomChange: (room: Record<RoomSlot, string>) => void;
  onCloseHome: () => void;
  playBin: (action: BinAction) => void;
}) {
  const [view, setView] = useState<TripView>(initialTrip);
  const [busy, setBusy] = useState(false);
  const [now, setNow] = useState(() => Date.now());
  const [revealStep, setRevealStep] = useState<number>(0);
  const [itemPlaced, setItemPlaced] = useState(false);

  // Update clock every 30s to keep countdown fresh
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 30_000);
    return () => clearInterval(timer);
  }, []);

  const { status, trip } = view;

  async function handleStart() {
    if (busy) return;
    setBusy(true);
    playBin("wave");
    playSfx("pop");
    haptic("light");

    const res = await startTrip();
    setBusy(false);
    if (!res.ok) {
      toast.error(res.error);
      return;
    }
    setView(res.data);
    haptic("success");
  }

  async function handleCollect() {
    if (busy || !trip) return;
    setBusy(true);
    playBin("jump");
    playSfx("pop");
    haptic("success");

    const res = await collectTrip({ tripId: trip.id });
    setBusy(false);
    if (!res.ok) {
      toast.error(res.error);
      return;
    }

    onBonesChange(res.data.bones);
    void fireConfetti("small");
    setView(res.data.view);

    // Sequence reveals: postcard -> story -> word -> reward
    setRevealStep(1);
    setTimeout(() => setRevealStep(2), 700);
    setTimeout(() => setRevealStep(3), 1400);
    setTimeout(() => setRevealStep(4), 2100);
  }

  async function handlePlaceAwardedItem(itemId: string) {
    const item = ITEM_BY_ID.get(itemId);
    if (!item) return;
    playSfx("pop");
    haptic("light");
    setItemPlaced(true);
    const res = await placeItem({ slot: item.slot, itemId: item.id });
    if (!res.ok) {
      setItemPlaced(false);
      toast.error(res.error);
      return;
    }
    onRoomChange({ [item.slot]: item.id } as Record<RoomSlot, string>);
    toast.success("Đã đặt vào phòng!");
  }

  function handleTts() {
    if (!trip?.story) return;
    const text = trip.story.lines.map((l) => l.target).join(" ");
    speakTts(text, trip.lang);
  }

  const goStudy = dueCount > 0 ? "/review" : "/practice";
  const place = trip ? placeById(trip.placeId) : null;
  const placeName = place?.name ?? trip?.placeId ?? "";

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={onBack}
          aria-label="Quay lại"
          className="grid size-11 shrink-0 place-items-center rounded-full bg-surface-2 text-fg-muted transition-colors hover:bg-surface-3 active:scale-95"
        >
          <ChevronLeft className="size-5" aria-hidden />
        </button>
        <h2 className="text-lg font-bold">Đi dạo</h2>
      </div>

      {/* LOCKED */}
      {status.kind === "locked" && (
        <div className="flex flex-col items-center gap-3 rounded-2xl bg-surface-2 p-6 text-center">
          <IconTile icon={Footprints} tone="grape" size={48} />
          <p className="max-w-xs text-sm font-semibold text-fg-muted">
            Hoàn thành thêm {status.needQuests} nhiệm vụ hoặc ôn thêm {status.needReviews} lượt để {name} được đi dạo.
          </p>
          <Link
            href={goStudy}
            onClick={onCloseHome}
            className="inline-flex min-h-11 items-center justify-center rounded-full bg-primary px-6 text-sm font-bold text-on-primary shadow-primary transition-transform active:scale-95"
          >
            Đi học
          </Link>
        </div>
      )}

      {/* READY */}
      {status.kind === "ready" && (
        <div className="flex flex-col items-center gap-3 rounded-2xl bg-surface-2 p-6 text-center">
          <IconTile icon={Footprints} tone="grape" size={48} />
          <h3 className="text-base font-extrabold text-fg">{name} muốn đi dạo!</h3>
          <p className="max-w-xs text-sm text-fg-muted">
            {name} sẽ đi khoảng 3 tiếng và mang quà về cho bạn.
          </p>
          <button
            type="button"
            disabled={busy}
            onClick={() => void handleStart()}
            className="inline-flex min-h-11 w-full max-w-xs items-center justify-center rounded-full bg-primary px-6 text-sm font-bold text-on-primary shadow-primary transition-transform active:scale-95 disabled:opacity-60"
          >
            Cho {name} đi dạo
          </button>
        </div>
      )}

      {/* AWAY */}
      {status.kind === "away" && trip && (
        <div className="flex flex-col items-center gap-3 rounded-2xl bg-surface-2 p-6 text-center">
          <IconTile icon={Footprints} tone="grape" size={48} />
          <h3 className="text-base font-extrabold text-fg">
            {name} đang ở {placeName}
          </h3>
          <p className="text-sm font-semibold text-fg">
            {trip.overnight
              ? `Sáng mai ${name} về`
              : `Về lúc ${new Intl.DateTimeFormat("vi-VN", {
                  hour: "2-digit",
                  minute: "2-digit",
                  timeZone: timezone,
                }).format(new Date(trip.returnsAt))}`}
          </p>
          {(() => {
            const diff = new Date(trip.returnsAt).getTime() - now;
            if (diff <= 0) return null;
            const hours = Math.floor(diff / (1000 * 60 * 60));
            const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
            const countStr = hours > 0 ? `còn ${hours} giờ ${minutes} phút` : `còn ${minutes} phút`;
            return <span className="text-xs font-bold text-fg-muted">({countStr})</span>;
          })()}
        </div>
      )}

      {/* BACK */}
      {status.kind === "back" && trip && revealStep === 0 && (
        <div className="flex flex-col items-center gap-3 rounded-2xl bg-c-grape-soft/40 p-6 text-center">
          <IconTile icon={Footprints} tone="grape" size={48} />
          <h3 className="text-base font-extrabold text-fg">{name} đã về tới!</h3>
          <p className="text-sm text-fg-muted">
            {name} mang một bưu thiếp và phần thưởng từ {placeName} về cho bạn.
          </p>
          <button
            type="button"
            disabled={busy}
            onClick={() => void handleCollect()}
            className="inline-flex min-h-11 w-full max-w-xs items-center justify-center rounded-full bg-primary px-6 text-sm font-bold text-on-primary shadow-primary transition-transform active:scale-95 disabled:opacity-60"
          >
            Đón {name}
          </button>
        </div>
      )}

      {/* COLLECT REVEAL SEQUENCE */}
      {trip && revealStep > 0 && (
        <div className="flex flex-col gap-3">
          {/* Postcard */}
          <div className="animate-in fade-in zoom-in-95 duration-500">
            <Postcard
              placeId={trip.placeId}
              day={new Date().toISOString().slice(0, 10)}
              word={trip.word?.term ?? null}
              size="md"
            />
          </div>

          {/* Story */}
          {revealStep >= 2 && trip.story && (
            <div className="flex flex-col gap-2 rounded-xl bg-surface-2 p-3.5 animate-in fade-in duration-300">
              <div className="flex items-center justify-between">
                <span className="text-xs font-extrabold uppercase tracking-wider text-fg-muted">Chuyện chuyến đi</span>
                {ttsSupported() && (
                  <button
                    type="button"
                    onClick={handleTts}
                    aria-label="Phát âm truyện"
                    className="grid size-8 place-items-center rounded-full bg-surface text-fg-muted transition-colors hover:bg-surface-3 active:scale-95"
                  >
                    <Volume2 className="size-4" aria-hidden />
                  </button>
                )}
              </div>
              <div className="flex flex-col gap-2">
                {trip.story.lines.map((l, i) => (
                  <div key={i} className="flex flex-col">
                    <p className="text-sm font-bold text-fg">{l.target}</p>
                    {trip.story?.pinyin?.[i] && (
                      <p className="font-mono text-xs text-primary">{trip.story.pinyin[i]}</p>
                    )}
                    <p className="text-xs text-fg-muted">{l.vi}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Word found */}
          {revealStep >= 3 && trip.word && (
            <div className="flex items-center justify-between rounded-xl bg-surface-2 px-3 py-2.5 animate-in fade-in duration-300">
              <div className="flex flex-col">
                <span className="text-[0.6875rem] font-bold text-fg-muted">Từ {name} nhặt được</span>
                <span className="text-sm font-extrabold text-fg">{trip.word.term}</span>
              </div>
              {trip.word.id ? (
                <Link
                  href={`/words/${trip.word.id}`}
                  onClick={onCloseHome}
                  className="rounded-full bg-surface px-3 py-1 text-xs font-bold text-primary shadow-xs hover:bg-surface-3"
                >
                  Xem từ
                </Link>
              ) : null}
            </div>
          )}

          {/* Rewards */}
          {revealStep >= 4 && (
            <div className="flex flex-col gap-2 rounded-xl bg-surface-2 p-3 animate-in fade-in duration-300">
              <div className="flex items-center justify-between">
                <span className="text-xs font-extrabold text-fg-muted">Phần thưởng</span>
                <span className="inline-flex items-center gap-1 text-sm font-extrabold text-streak-fg">
                  <Bone className="size-4" aria-hidden />+
                  <CountUp value={trip.bones} /> xương
                </span>
              </div>

              {trip.itemId && (
                <div className="flex items-center justify-between rounded-lg bg-surface p-2">
                  <div className="flex items-center gap-2">
                    <RoomItemIcon id={trip.itemId} size={32} />
                    <div className="flex flex-col">
                      <span className="inline-flex items-center gap-1 text-[0.6875rem] font-bold text-c-gold-fg">
                        <Sparkles className="size-3" aria-hidden /> Đồ hiếm
                      </span>
                      <span className="text-xs font-bold text-fg">
                        {ITEM_BY_ID.get(trip.itemId)?.name ?? trip.itemId}
                      </span>
                    </div>
                  </div>
                  <button
                    type="button"
                    disabled={itemPlaced}
                    onClick={() => void handlePlaceAwardedItem(trip.itemId!)}
                    className="rounded-full bg-primary-soft px-3 py-1 text-xs font-bold text-primary-fg transition-transform active:scale-95 disabled:opacity-60"
                  >
                    {itemPlaced ? "Đã đặt" : "Đặt vào phòng"}
                  </button>
                </div>
              )}

              <button
                type="button"
                onClick={() => {
                  setView((v) => ({ ...v, status: { kind: "done" } }));
                  setRevealStep(0);
                }}
                className="mt-1 inline-flex min-h-11 w-full items-center justify-center rounded-full bg-primary px-5 text-sm font-bold text-on-primary shadow-primary transition-transform active:scale-95"
              >
                Xong
              </button>
            </div>
          )}
        </div>
      )}

      {/* DONE */}
      {status.kind === "done" && (
        <div className="flex flex-col items-center gap-3 rounded-2xl bg-surface-2 p-6 text-center">
          <IconTile icon={Footprints} tone="grape" size={48} />
          <p className="max-w-xs text-sm font-bold text-fg">Hôm nay {name} đi dạo rồi. Mai đi tiếp nhé.</p>
          <Link
            href="/bin/postcards"
            onClick={onCloseHome}
            className="text-sm font-bold text-primary underline underline-offset-2"
          >
            Xem album bưu thiếp
          </Link>
        </div>
      )}

      {/* Album link footer */}
      {status.kind !== "done" && (
        <div className="mt-2 text-center">
          <Link
            href="/bin/postcards"
            onClick={onCloseHome}
            className="text-xs font-semibold text-fg-muted underline underline-offset-2 hover:text-fg"
          >
            Xem album bưu thiếp ({name})
          </Link>
        </div>
      )}
    </div>
  );
}
