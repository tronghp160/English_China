"use client";

import { Bone, Footprints, Heart, Lock, Mail, PawPrint, Shirt, Sofa, Star, Volleyball, X } from "lucide-react";
import { m } from "motion/react";
import Link from "next/link";
import { Dialog as DialogPrimitive } from "radix-ui";
import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { useMe } from "@/components/app-shell/me-provider";
import { DialogOverlay, DialogPortal } from "@/components/ui/dialog";
import { feedBin, loadBinHome, setBinOutfit, type BinHomeData } from "@/lib/actions/bin";
import { DEFAULT_ROOM, type RoomSlot } from "@/lib/bin/catalog";
import { placeById } from "@/lib/bin/places";
import { haptic } from "@/lib/haptics";
import { say as sayLine, type LineKey } from "@/lib/mascot/lines";
import {
  BIN_MOOD_LABEL,
  binMoodFor,
  binMoodScore,
  isNight,
  OUTFITS,
  outfitCondition,
  TRICKS,
  type OutfitId,
  type TrickId,
} from "@/lib/progress";
import { playSfx } from "@/lib/sfx";
import { TONE_CLASSES, type Tone } from "@/lib/tone";
import { cn } from "@/lib/utils";
import { BinBuddies } from "./bin-buddies";
import { BinDecor } from "./bin-decor";
import type { BinPanel } from "./bin-home-provider";
import { BinRoom } from "./bin-room";
import { BinTrip } from "./bin-trip";
import type { BuddySpecies } from "@/lib/bin/buddies";
import { OutfitIcon } from "./outfits";
import { Pup } from "./pup";
import { useBinAction } from "./use-bin";

/** Randomness lives out here: it is only used from event handlers, never while rendering. */
const roll = () => Math.random();

const TILES: {
  id: "feed" | "play" | "tricks" | "outfits" | "decor" | "trip" | "postcards" | "buddies";
  label: string;
  tone: Tone;
  icon: typeof Bone;
}[] = [
  { id: "feed", label: "Cho ăn", tone: "sun", icon: Bone },
  { id: "play", label: "Ném bóng", tone: "mint", icon: Volleyball },
  { id: "tricks", label: "Làm trò", tone: "blue", icon: Star },
  { id: "outfits", label: "Trang phục", tone: "pink", icon: Shirt },
  { id: "decor", label: "Trang trí", tone: "orange", icon: Sofa },
  { id: "trip", label: "Đi dạo", tone: "grape", icon: Footprints },
  { id: "postcards", label: "Bưu thiếp", tone: "teal", icon: Mail },
  { id: "buddies", label: "Bạn nhỏ", tone: "coral", icon: PawPrint },
];

/**
 * "Góc của Bin" (REDESIGN_V3 §5.2, mockup 06): a sheet from the bottom on a phone, a wide dialog on a laptop.
 * Feed Bin a bone (drag it, or the button), throw the ball, ask for a trick, pick an outfit. What it shows is
 * read when it opens (`loadBinHome`); feeding and the outfit are saved by server actions.
 */
export function BinHome({
  open,
  onOpenChange,
  initialPanel = "main",
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialPanel?: BinPanel;
}) {
  const { prefs, dueCount } = useMe();
  const name = prefs.mascot_name;
  const [panel, setPanel] = useState<BinPanel>(initialPanel === "decor:special" ? "decor" : initialPanel);
  const [decorSlot, setDecorSlot] = useState<RoomSlot | "special">(
    initialPanel === "decor:special" ? "special" : "bowl",
  );
  const [preview, setPreview] = useState<{ slot: RoomSlot; itemId: string } | null>(null);
  const [data, setData] = useState<BinHomeData | null>(null);
  const [failed, setFailed] = useState(false);
  const [line, setLine] = useState("");
  const [tricksOpen, setTricksOpen] = useState(false);
  const [noBone, setNoBone] = useState(false);
  const [busy, setBusy] = useState(false);
  const [chasing, setChasing] = useState(false);
  const [outfit, setOutfit] = useState<string>(prefs.bin_outfit);
  const [night] = useState(() => isNight(new Date().getHours()));
  const binRef = useRef<HTMLDivElement>(null);
  const outfitsRef = useRef<HTMLDivElement>(null);
  const chase = useRef<ReturnType<typeof setTimeout>>(undefined);

  const ownedSet = useMemo(() => new Set(data?.owned ?? []), [data?.owned]);

  const score = data
    ? binMoodScore({ reviewedToday: data.reviewedToday, streak: data.streak, fedToday: data.fedToday, questsDone: data.questsDone })
    : 3;
  const baseMood = binMoodFor(score, night);
  const bin = useBinAction(baseMood);

  const [prevOpen, setPrevOpen] = useState(open);
  const [prevInitialPanel, setPrevInitialPanel] = useState(initialPanel);
  if (open !== prevOpen || initialPanel !== prevInitialPanel) {
    setPrevOpen(open);
    setPrevInitialPanel(initialPanel);
    if (!open) {
      setPanel("main");
      setPreview(null);
    } else {
      if (initialPanel === "decor:special") {
        setPanel("decor");
        setDecorSlot("special");
      } else {
        setPanel(initialPanel);
        if (initialPanel === "decor") {
          setDecorSlot("bowl");
        }
      }
    }
  }

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    void loadBinHome().then((res) => {
      if (cancelled) return;
      if (res.ok) {
        setData(res.data);
        setOutfit(res.data.outfit);
        setFailed(false);
      } else {
        setFailed(true);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [open]);

  useEffect(() => () => clearTimeout(chase.current), []);

  const speak = (key: LineKey, seed = Math.floor(roll() * 1000)) => setLine(sayLine(key, { seed, name }));

  async function feed() {
    if (!data || busy) return;
    if (data.bones <= 0) {
      setNoBone(true);
      bin.play("droop");
      speak("noBone", 0); // always the plain hint: it says what to do
      haptic("error");
      return;
    }
    setBusy(true);
    setNoBone(false);
    const before = data;
    setData({ ...data, bones: data.bones - 1, fedToday: true });
    bin.play("eat");
    speak("feed");
    haptic("light");
    const res = await feedBin();
    setBusy(false);
    if (!res.ok) {
      setData(before);
      toast.error(res.error);
    }
  }

  function throwBall() {
    if (chasing) return;
    setNoBone(false);
    playSfx("pop");
    haptic("light");
    if (roll() < 0.2) {
      // A miss: Bin runs after the ball, out of the room and back, and comes home with it.
      setChasing(true);
      speak("playMiss");
      chase.current = setTimeout(() => {
        setChasing(false);
        bin.play("catch");
        speak("play");
      }, 1600);
      return;
    }
    bin.play("catch");
    speak("play");
  }

  function trick(id: TrickId) {
    bin.play(id);
    speak("trick");
  }

  async function choose(id: OutfitId) {
    if (!data || !data.outfits.includes(id) || id === outfit) return;
    const before = outfit;
    setOutfit(id);
    bin.play("spin");
    speak("outfit");
    playSfx("pop");
    const res = await setBinOutfit(id);
    if (!res.ok) {
      setOutfit(before);
      toast.error(res.error);
    }
  }

  function onTile(id: (typeof TILES)[number]["id"]) {
    if (id === "feed") void feed();
    else if (id === "play") throwBall();
    else if (id === "tricks") setTricksOpen((v) => !v);
    else if (id === "decor") setPanel("decor");
    else if (id === "trip") setPanel("trip");
    else if (id === "buddies") setPanel("buddies");
    else outfitsRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }

  const isAway = data?.trip?.status.kind === "away";
  const isBack = data?.trip?.status.kind === "back";
  const level = data?.level;
  const bones = data?.bones ?? 0;
  const goStudy = dueCount > 0 ? "/review" : "/practice";

  return (
    <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
      <DialogPortal>
        <DialogOverlay />
        <DialogPrimitive.Content
          aria-describedby={undefined}
          className={cn(
            "fixed inset-x-0 bottom-0 z-50 flex max-h-[90dvh] flex-col gap-4 overflow-y-auto rounded-t-xl bg-surface px-4 pt-2.5 pb-[calc(1.25rem+env(safe-area-inset-bottom))] shadow-lg outline-none",
            "data-open:animate-in data-open:slide-in-from-bottom data-closed:animate-out data-closed:slide-out-to-bottom",
            "lg:inset-auto lg:top-1/2 lg:left-1/2 lg:w-[min(58rem,calc(100vw-4rem))] lg:-translate-x-1/2 lg:-translate-y-1/2 lg:rounded-xl lg:p-8 lg:data-open:slide-in-from-bottom-0 lg:data-open:zoom-in-95",
          )}
        >
          <span aria-hidden className="mx-auto h-[5px] w-10 shrink-0 rounded-full bg-surface-3 lg:hidden" />

          <header className="flex items-center gap-2.5">
            <DialogPrimitive.Title className="min-w-0 flex-1 truncate text-[1.375rem] font-extrabold tracking-[-0.03em] lg:text-2xl">
              Góc của {name}
            </DialogPrimitive.Title>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-streak-soft px-3 py-1.5 text-sm font-extrabold text-streak-fg tabular-nums">
              <Bone className="size-4" aria-hidden />
              {data ? `${bones} xương` : "… xương"}
            </span>
            <DialogPrimitive.Close
              aria-label="Đóng"
              className="grid size-11 shrink-0 place-items-center rounded-full bg-surface-2 text-fg-muted transition-colors hover:bg-surface-3"
            >
              <X className="size-5" aria-hidden />
            </DialogPrimitive.Close>
          </header>

          <div className="flex items-center gap-2.5">
            <span className="rounded-full bg-xp-soft px-2.5 py-0.5 text-sm font-extrabold text-xp-fg">
              Cấp {level?.level ?? "…"}
            </span>
            <div
              className="h-2 flex-1 overflow-hidden rounded-full bg-surface-3"
              role="progressbar"
              aria-label="Kinh nghiệm trong cấp này"
              aria-valuemin={0}
              aria-valuemax={level?.xpForNext ?? 1}
              aria-valuenow={level?.xpInLevel ?? 0}
            >
              <div className="h-full rounded-full bg-xp" style={{ width: `${Math.round((level?.progress ?? 0) * 100)}%` }} />
            </div>
            <span className="text-sm text-fg-muted tabular-nums">{level ? `${level.xpInLevel}/${level.xpForNext} XP` : "…"}</span>
          </div>

          <div className="grid gap-4 lg:grid-cols-[1.15fr_1fr] lg:gap-6">
            <div className="flex flex-col gap-3">
              <div className="relative h-[270px] overflow-hidden rounded-[24px] bg-scene-wall lg:h-[360px]">
                <BinRoom
                  night={night}
                  name={name}
                  room={data?.room ?? DEFAULT_ROOM}
                  preview={preview}
                  away={
                    isAway && data?.trip?.trip
                      ? {
                          placeName: placeById(data.trip.trip.placeId)?.name ?? data.trip.trip.placeId,
                          backAt: data.trip.trip.returnsAt,
                        }
                      : null
                  }
                  buddy={(prefs.bin_buddy as BuddySpecies) || null}
                />

                {!isAway && (
                  <m.div
                    ref={binRef}
                    className="absolute bottom-[26px] left-1/2 -ml-[64px] lg:-ml-[110px]"
                    animate={chasing ? { x: [0, 190, 190, 0] } : { x: 0 }}
                    transition={chasing ? { duration: 1.5, times: [0, 0.35, 0.55, 1], ease: "easeInOut" } : { duration: 0.2 }}
                  >
                    <Pup
                      mood={isBack ? "love" : bin.mood}
                      action={bin.action}
                      outfit={outfit}
                      follow
                      className="size-[170px] lg:size-[220px]"
                      size={170}
                    />
                  </m.div>
                )}

                {chasing && (
                  <m.span
                    aria-hidden
                    className="absolute bottom-[34px] left-[55%] size-4 rounded-full border-2 border-border-strong bg-c-mint"
                    initial={{ x: 0, opacity: 1 }}
                    animate={{ x: [0, 190, 190, 190], opacity: [1, 1, 1, 0] }}
                    transition={{ duration: 1.5, times: [0, 0.35, 0.55, 0.6] }}
                  />
                )}

                {bones > 0 && !isAway && (
                  <>
                    <m.button
                      type="button"
                      aria-label="Kéo xương cho Bin ăn"
                      className="absolute bottom-[112px] left-[34px] z-10 grid size-14 cursor-grab place-items-center touch-none rounded-full active:cursor-grabbing"
                      drag
                      dragSnapToOrigin
                      dragMomentum={false}
                      whileDrag={{ scale: 1.15, zIndex: 20 }}
                      onDragEnd={(_, info) => {
                        const r = binRef.current?.getBoundingClientRect();
                        if (!r) return;
                        const x = info.point.x - window.scrollX;
                        const y = info.point.y - window.scrollY;
                        if (x > r.left - 16 && x < r.right + 16 && y > r.top - 16 && y < r.bottom + 16) void feed();
                      }}
                      onClick={() => void feed()}
                    >
                      <svg viewBox="0 0 30 20" width={54} height={36} aria-hidden fill="var(--surface)" stroke="var(--c-sun-fg)" strokeWidth={1.8} strokeLinejoin="round">
                        <path d="M6.5 11.5a3.2 3.2 0 1 1 1.6-4.4h13.8a3.2 3.2 0 1 1 1.6 4.4a3.2 3.2 0 1 1-1.6 4.4H8.1a3.2 3.2 0 1 1-1.6-4.4z" />
                      </svg>
                    </m.button>
                    <svg
                      aria-hidden
                      viewBox="0 0 110 60"
                      width={62}
                      height={34}
                      fill="none"
                      stroke="var(--primary)"
                      strokeWidth={5}
                      strokeLinecap="round"
                      strokeDasharray="6 12"
                      className="pointer-events-none absolute bottom-[132px] left-[88px] hidden sm:block"
                    >
                      <path d="M4 52C30 4 70 4 100 34" />
                    </svg>
                    <span className="pointer-events-none absolute bottom-[78px] left-3.5 rounded-full bg-surface px-2.5 py-1 text-[0.8125rem] font-bold text-primary-fg shadow-xs">
                      Kéo xương cho {name}
                    </span>
                  </>
                )}
              </div>

              <p aria-live="polite" className="min-h-6 text-center text-[0.9375rem] font-semibold text-fg-muted">
                {failed ? "Chưa tải được. Mở lại sau nhé." : line}
              </p>
              {noBone && (
                <Link
                  href={goStudy}
                  className="mx-auto inline-flex min-h-11 items-center rounded-full bg-primary px-5 text-sm font-bold text-on-primary shadow-primary"
                  onClick={() => onOpenChange(false)}
                >
                  Đi học
                </Link>
              )}

              <div className="flex items-center justify-between">
                <span className="text-[0.9375rem] font-bold">Tâm trạng: {BIN_MOOD_LABEL[baseMood] ?? "Ổn"}</span>
                <span className="flex gap-1" role="img" aria-label={`${score} trên 5`}>
                  {Array.from({ length: 5 }, (_, i) => (
                    <Heart
                      key={i}
                      aria-hidden
                      className={cn("size-5", i < score ? "fill-c-pink stroke-c-pink-fg" : "fill-surface-2 stroke-border-strong")}
                      strokeWidth={1.6}
                    />
                  ))}
                </span>
              </div>
            </div>

            <div className="flex flex-col gap-4">
              {panel === "decor" &&
                (data ? (
                  <BinDecor
                    bones={data.bones}
                    level={data.level.level}
                    longestStreak={data.longestStreak}
                    room={data.room}
                    owned={ownedSet}
                    scarves={data.scarves}
                    name={name}
                    initialSlot={decorSlot}
                    onBonesChange={(bones) => setData((d) => (d ? { ...d, bones } : d))}
                    onRoomChange={(room) => setData((d) => (d ? { ...d, room } : d))}
                    onOwnedAdd={(itemId) =>
                      setData((d) => (d ? { ...d, owned: Array.from(new Set([...d.owned, itemId])) } : d))
                    }
                    onScarvesChange={(scarves) => setData((d) => (d ? { ...d, scarves } : d))}
                    onPreview={setPreview}
                    onBack={() => {
                      setPreview(null);
                      setPanel("main");
                    }}
                    playBin={bin.play}
                    speak={speak}
                    dueCount={dueCount}
                    onCloseHome={() => onOpenChange(false)}
                  />
                ) : (
                  <div className="flex min-h-[200px] items-center justify-center text-sm font-semibold text-fg-muted">
                    Đang tải…
                  </div>
                ))}

              {panel === "trip" &&
                (data ? (
                  <BinTrip
                    name={name}
                    dueCount={dueCount}
                    initialTrip={data.trip}
                    onBack={() => setPanel("main")}
                    onBonesChange={(bones) => setData((d) => (d ? { ...d, bones } : d))}
                    onRoomChange={(room) => setData((d) => (d ? { ...d, room: { ...d.room, ...room } } : d))}
                    onCloseHome={() => onOpenChange(false)}
                    playBin={bin.play}
                  />
                ) : (
                  <div className="flex min-h-[200px] items-center justify-center text-sm font-semibold text-fg-muted">
                    Đang tải…
                  </div>
                ))}

              {panel === "buddies" && (
                <BinBuddies
                  name={name}
                  onBack={() => setPanel("main")}
                  activeBuddy={(prefs.bin_buddy as BuddySpecies) || null}
                  playBin={bin.play}
                  speak={speak}
                />
              )}

              {panel === "main" && (
                <>
                  <div className="grid grid-cols-4 gap-2">
                    {TILES.map(({ id, label, tone, icon: Icon }) => {
                      const t = TONE_CLASSES[tone];
                      const disabledAway = isAway && (id === "feed" || id === "play" || id === "tricks");
                      const disabled = (id === "feed" && busy) || disabledAway;
                      const title = disabledAway ? `${name} đang đi dạo` : undefined;
                      const isEggReady = id === "buddies" && data?.hasReadyEgg;
                      const ariaLabel = isEggReady ? `${label}, có trứng sắp nở` : undefined;

                      if (id === "postcards") {
                        return (
                          <Link
                            key={id}
                            href="/bin/postcards"
                            onClick={() => onOpenChange(false)}
                            className={cn(
                              "flex min-h-[76px] flex-col items-center justify-center gap-1.5 rounded-[18px] px-1 text-center text-sm leading-tight font-bold transition-transform active:scale-95",
                              t.soft,
                              t.fg,
                            )}
                          >
                            <Icon className="size-6" aria-hidden />
                            {label}
                          </Link>
                        );
                      }

                      return (
                        <button
                          key={id}
                          type="button"
                          title={title}
                          aria-label={ariaLabel}
                          aria-expanded={id === "tricks" ? tricksOpen : undefined}
                          disabled={disabled}
                          onClick={() => onTile(id)}
                          className={cn(
                            "relative flex min-h-[76px] flex-col items-center justify-center gap-1.5 rounded-[18px] px-1 text-center text-sm leading-tight font-bold transition-transform active:scale-95 disabled:opacity-60",
                            t.soft,
                            t.fg,
                          )}
                        >
                          {isEggReady && (
                            <span className="absolute top-2 right-2 size-2.5 rounded-full bg-c-coral ring-2 ring-surface" />
                          )}
                          <Icon className="size-6" aria-hidden />
                          {label}
                        </button>
                      );
                    })}
                  </div>

                  {tricksOpen && data && (
                    <div className="flex flex-col gap-2">
                      <span className="text-sm font-bold text-fg-muted">Làm trò</span>
                      <div className="flex flex-wrap gap-2">
                        {TRICKS.map((t) => {
                          const unlocked = data.tricks.includes(t.id);
                          return (
                            <button
                              key={t.id}
                              type="button"
                              disabled={!unlocked}
                              aria-label={unlocked ? t.name : `${t.name}, mở ở cấp ${t.level}`}
                              onClick={() => trick(t.id)}
                              className={cn(
                                "inline-flex min-h-11 items-center gap-1.5 rounded-full px-4 text-sm font-bold",
                                unlocked ? "bg-primary-soft text-primary-fg" : "bg-surface-2 text-fg-muted",
                              )}
                            >
                              {!unlocked && <Lock className="size-3.5" aria-hidden />}
                              {t.name}
                              {!unlocked && <span className="font-semibold">· Cấp {t.level}</span>}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  <div ref={outfitsRef} className="flex flex-col gap-2">
                    <span className="text-sm font-bold text-fg-muted">Trang phục</span>
                    <div className="flex flex-wrap gap-2">
                      {OUTFITS.map((o) => {
                        const unlocked = data ? data.outfits.includes(o.id) : o.id === "none";
                        const worn = outfit === o.id;
                        const need = outfitCondition(o);
                        return (
                          <button
                            key={o.id}
                            type="button"
                            disabled={!unlocked}
                            aria-pressed={unlocked ? worn : undefined}
                            aria-label={unlocked ? `${o.name}${worn ? ", đang mặc" : ""}` : `${o.name}, mở khi ${need?.toLowerCase()}`}
                            onClick={() => void choose(o.id)}
                            className={cn(
                              "relative grid size-16 place-items-center rounded-md border-2 transition-colors",
                              worn ? "border-primary bg-primary-soft" : unlocked ? "border-border bg-surface hover:bg-surface-2" : "border-surface-2 bg-surface-2 text-fg-muted",
                            )}
                          >
                            {unlocked ? (
                              <OutfitIcon outfit={o.id} size={36} />
                            ) : (
                              <span className="flex flex-col items-center gap-0.5 text-[0.8125rem] leading-none font-bold">
                                <Lock className="size-5" aria-hidden />
                                {need?.replace("Chuỗi ", "")}
                              </span>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        </DialogPrimitive.Content>
      </DialogPortal>
    </DialogPrimitive.Root>
  );
}
