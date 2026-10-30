"use client";

import { Bone, Flame, Footprints, Gift, Sparkles } from "lucide-react";
import { m, useReducedMotion } from "motion/react";
import { useEffect, useRef, useState } from "react";
import { useMe } from "@/components/app-shell/me-provider";
import { Confetti } from "@/components/fx/confetti";
import { CountUp } from "@/components/fx/count-up";
import { useBinHome } from "@/components/mascot/bin-home-provider";
import { Buddy } from "@/components/mascot/buddy";
import { Egg } from "@/components/mascot/egg";
import { Pup } from "@/components/mascot/pup";
import { buddyBySpecies, type BuddySpecies } from "@/lib/bin/buddies";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { IconTile } from "@/components/ui/icon-tile";
import { loadSessionRewards, type SessionRewardData } from "@/lib/actions/bin";
import { haptic } from "@/lib/haptics";
import { sessionGains, type SessionGains } from "@/lib/progress";
import { playSfx } from "@/lib/sfx";
import { takeSessionBaseline } from "@/lib/session-baseline";
import { cn } from "@/lib/utils";
import { useOutboxStatus } from "./session-bar";

/** Time between two gifts being opened. */
const STEP_MS = 750;
/** If the answers have not all reached the server by then, the totals are estimated from this session. */
const WAIT_FOR_SYNC_MS = 6000;

type Gift = "level" | "streak" | "bones" | "unlocks" | "egg" | "eggReady";

function giftsOf(
  g: SessionGains,
  extendedStreak: boolean,
  streak: number,
  newEggs: BuddySpecies[] = [],
  eggReady: BuddySpecies[] = [],
): Gift[] {
  const list: Gift[] = ["level"];
  if (extendedStreak && streak > 0) list.push("streak");
  if (g.bonesEarned > 0) list.push("bones");
  if (g.newOutfits.length || g.newTricks.length) list.push("unlocks");
  if (newEggs.length > 0) list.push("egg");
  if (eggReady.length > 0) list.push("eggReady");
  return list;
}

function GiftCard({ children, className }: { children: React.ReactNode; className?: string }) {
  const reduced = useReducedMotion();
  return (
    <m.div
      initial={reduced ? false : { opacity: 0, y: 18, scale: 0.96 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ type: "spring", stiffness: 420, damping: 30 }}
      className={cn("flex items-center gap-3.5 rounded-lg p-4", className)}
    >
      {children}
    </m.div>
  );
}

/**
 * What a session earned, opened one gift at a time (REDESIGN_V3 §9): the XP and level bar, a streak that
 * grew today, the bones for Bin and new outfits or tricks. A tap anywhere opens the rest at once; reduced
 * motion shows them all. A new level opens a dialog. The totals come from the server once the answers are
 * sent (and are estimated from this session when that takes too long).
 */
export function SessionGifts({ xp, correct, answers }: { xp: number; correct: number; answers: number }) {
  const { prefs } = useMe();
  const home = useBinHome();
  const reduced = useReducedMotion();
  const sync = useOutboxStatus();
  const [data, setData] = useState<{ now: SessionRewardData; base: SessionRewardData | null; flushed: boolean } | null>(null);
  const [opened, setOpened] = useState(0);
  const [settled, setSettled] = useState(false);
  const [levelUp, setLevelUp] = useState(false);
  const asked = useRef(false);
  const pending = useRef(sync.pending);
  useEffect(() => {
    pending.current = sync.pending;
  });

  useEffect(() => {
    if (asked.current) return;
    const ask = () => {
      if (asked.current) return;
      asked.current = true;
      const flushed = pending.current === 0;
      void Promise.all([takeSessionBaseline(), loadSessionRewards()]).then(([base, now]) => now.ok && setData({ now: now.data, base, flushed }));
    };
    // Give the server a moment after the last answer is accepted, then read the totals.
    const timer = setTimeout(ask, sync.pending === 0 ? 500 : WAIT_FOR_SYNC_MS);
    return () => clearTimeout(timer);
  }, [sync.pending]);

  // Totals before and after. Before: what the server said when the session began (else this session's XP taken
  // off the total). After: the server's total once every answer is in, else the estimate from this session.
  const { gains, extended, streak } = (() => {
    if (!data) return { gains: null, extended: false, streak: 0 };
    const { now, base, flushed } = data;
    const xpAfter = flushed ? now.totalXp : (base?.totalXp ?? now.totalXp) + xp;
    const xpBefore = base ? base.totalXp : xpAfter - xp;
    const correctAfter = flushed ? now.totalCorrect : (base?.totalCorrect ?? now.totalCorrect) + correct;
    const correctBefore = base ? base.totalCorrect : correctAfter - correct;
    const first = base ? base.reviewsToday === 0 : flushed ? now.reviewsToday - answers <= 0 : now.reviewsToday === 0;
    const streakNow = flushed ? now.streak : (base?.streak ?? now.streak) + (first ? 1 : 0);
    return {
      gains: sessionGains({ xpBefore, xpAfter, correctBefore, correctAfter, streakNow, extendedStreak: first }),
      extended: first,
      streak: streakNow,
    };
  })();
  const newEggs = data?.now.newEggs ?? [];
  const eggReady = (data?.now.eggReady ?? []).filter(
    (sp) => !(data?.base?.eggReady ?? []).includes(sp),
  );
  const gifts = gains ? giftsOf(gains, extended, streak, newEggs, eggReady) : [];

  // Open the gifts one by one (all at once with reduced motion).
  useEffect(() => {
    if (!gifts.length || opened >= gifts.length) return;
    const timer = setTimeout(() => {
      setOpened(reduced ? gifts.length : opened + 1);
      playSfx("pop");
    }, opened === 0 ? 150 : reduced ? 0 : STEP_MS);
    return () => clearTimeout(timer);
  }, [gifts.length, opened, reduced]);

  // A new level opens its dialog once the level gift is open and its bar has filled.
  const levelOpen = opened > 0;
  const leveledUp = gains?.leveledUp ?? false;
  useEffect(() => {
    if (!levelOpen || !leveledUp) return;
    const timer = setTimeout(
      () => {
        setLevelUp(true);
        playSfx("levelUp");
        haptic("success");
      },
      reduced ? 0 : 1100,
    );
    return () => clearTimeout(timer);
  }, [levelOpen, leveledUp, reduced]);

  if (!gains || xp + answers <= 0) return null;
  const shownLevel = leveledUp && !settled ? gains.before : gains.after;
  const bar = leveledUp && !settled ? [gains.before.progress, 1] : [gains.before.progress, gains.after.progress];
  const allOpen = opened >= gifts.length;

  return (
    <section
      role="group"
      aria-label="Phần thưởng của phiên"
      onClick={() => !allOpen && setOpened(gifts.length)}
      className="mt-6 flex flex-col gap-2.5"
    >
      {opened > 0 && (
        <GiftCard className="bg-xp-soft">
          <span className="grid size-12 shrink-0 place-items-center rounded-md bg-xp font-display text-xl text-on-primary tabular-nums">
            {shownLevel.level}
          </span>
          <div className="min-w-0 flex-1">
            <div className="flex items-baseline justify-between gap-2">
              <p className="font-extrabold text-xp-fg">Cấp {shownLevel.level}</p>
              <p className="text-sm font-bold text-xp-fg tabular-nums">
                +<CountUp value={gains.xpGained} /> XP
              </p>
            </div>
            <div
              role="progressbar"
              aria-label="Kinh nghiệm trong cấp này"
              aria-valuemin={0}
              aria-valuemax={shownLevel.xpForNext}
              aria-valuenow={shownLevel.xpInLevel}
              className="mt-1.5 h-2.5 overflow-hidden rounded-full bg-surface/70"
            >
              <m.span
                key={settled ? "after" : "before"}
                className="block h-full rounded-full bg-xp"
                initial={{ width: `${Math.round(bar[0] * 100)}%` }}
                animate={{ width: `${Math.round(bar[1] * 100)}%` }}
                transition={reduced ? { duration: 0 } : { duration: 0.9, ease: [0.22, 1, 0.36, 1], delay: 0.2 }}
              />
            </div>
            <p className="mt-1 text-xs text-xp-fg tabular-nums">
              {shownLevel.xpInLevel}/{shownLevel.xpForNext} XP
            </p>
          </div>
        </GiftCard>
      )}

      {gifts.includes("streak") && opened > gifts.indexOf("streak") && (
        <GiftCard className="bg-streak-soft text-streak-fg">
          <IconTile
            icon={Flame}
            tone="sun"
            size={48}
            solid
            className="streak-flare text-white [&_svg]:fill-white [&_svg]:stroke-[var(--streak-fg)]"
          />
          <div className="min-w-0">
            <p className="font-extrabold">Chuỗi {streak} ngày</p>
            <p className="text-sm">Hôm nay bạn đã giữ được chuỗi.</p>
          </div>
        </GiftCard>
      )}

      {gifts.includes("bones") && opened > gifts.indexOf("bones") && (
        <GiftCard className="bg-c-orange-soft text-c-orange-fg">
          <IconTile icon={Bone} tone="orange" size={48} solid />
          <div className="min-w-0">
            <p className="font-extrabold">+{gains.bonesEarned} xương</p>
            <p className="text-sm">{prefs.mascot ? "Cho Bin ăn ở Góc của Bin." : "Xương dành để cho Bin ăn."}</p>
          </div>
        </GiftCard>
      )}

      {gifts.includes("unlocks") && opened > gifts.indexOf("unlocks") && (
        <GiftCard className="bg-c-pink-soft text-c-pink-fg">
          <IconTile icon={Gift} tone="pink" size={48} solid />
          <div className="min-w-0">
            <p className="font-extrabold">Mở khóa mới</p>
            <p className="text-sm">
              {[...gains.newOutfits.map((o) => `Trang phục ${o.name.toLowerCase()}`), ...gains.newTricks.map((t) => `Trò ${t.name.toLowerCase()}`)].join(", ")}
            </p>
          </div>
        </GiftCard>
      )}

      {gifts.includes("egg") && opened > gifts.indexOf("egg") && newEggs.length > 0 && (
        <GiftCard className="justify-between bg-c-coral-soft text-c-coral-fg">
          <div className="flex min-w-0 items-center gap-3.5">
            <Egg species={newEggs[0]} size={48} />
            <div className="min-w-0">
              <p className="font-extrabold">Bạn nhận được một quả trứng!</p>
              <p className="text-sm">
                Ấp đủ {buddyBySpecies(newEggs[0])?.hatchCorrect ?? 30} câu đúng để nở.
              </p>
            </div>
          </div>
          <Button
            type="button"
            size="sm"
            className="shrink-0"
            onClick={() => home?.open("buddies")}
          >
            Xem trứng
          </Button>
        </GiftCard>
      )}

      {gifts.includes("eggReady") && opened > gifts.indexOf("eggReady") && eggReady.length > 0 && (
        <GiftCard className="justify-between bg-c-coral-soft text-c-coral-fg">
          <div className="flex min-w-0 items-center gap-3.5">
            <Egg species={eggReady[0]} ready size={48} />
            <div className="min-w-0">
              <p className="font-extrabold">Trứng sắp nở rồi!</p>
              <p className="text-sm">Chạm vào trứng trong phòng để ấp nở.</p>
            </div>
          </div>
          <Button
            type="button"
            size="sm"
            className="shrink-0"
            onClick={() => home?.open("buddies")}
          >
            Xem trứng
          </Button>
        </GiftCard>
      )}

      {prefs.mascot && data?.now.trip?.kind === "ready" && (!data.base || data.base.trip?.kind !== "ready") && allOpen && (
        <GiftCard className="bg-c-grape-soft text-c-grape-fg justify-between">
          <div className="flex items-center gap-3.5">
            <IconTile icon={Footprints} tone="grape" size={48} solid />
            <div className="min-w-0">
              <p className="font-extrabold">Đủ điều kiện!</p>
              <p className="text-sm">Cho {prefs.mascot_name} đi dạo</p>
            </div>
          </div>
          <Button
            type="button"
            size="sm"
            className="shrink-0"
            onClick={() => home?.open("trip")}
          >
            Đi dạo
          </Button>
        </GiftCard>
      )}

      {!allOpen && !reduced && <p className="text-center text-xs text-fg-subtle">Chạm để mở nhanh</p>}

      <Dialog
        open={levelUp}
        onOpenChange={(o) => {
          setLevelUp(o);
          if (!o) setSettled(true);
        }}
      >
        <DialogContent showCloseButton={false} className="items-center text-center">
          {levelUp && <Confetti preset="big" />}
          {prefs.mascot && (
            <div className="mx-auto flex items-end justify-center gap-3">
              <Pup mood="cheer" action="dance" size={120} />
              {prefs.bin_buddy && (
                <div className="animate-pop">
                  <Buddy species={prefs.bin_buddy as BuddySpecies} mood="cheer" size={60} />
                </div>
              )}
            </div>
          )}
          <DialogTitle className="font-display text-[1.75rem] leading-tight font-extrabold">Lên cấp {gains.after.level}!</DialogTitle>
          <DialogDescription>
            Bạn đã đạt cấp {gains.after.level}. Cứ học đều, mỗi ngày một chút là được.
          </DialogDescription>
          {(gains.newOutfits.length > 0 || gains.newTricks.length > 0) && (
            <ul className="flex flex-col gap-1.5 text-left">
              {gains.newOutfits.map((o) => (
                <li key={o.id} className="flex items-center gap-2 rounded-md bg-c-pink-soft px-3 py-2 font-semibold text-c-pink-fg">
                  <Sparkles className="size-4 shrink-0" strokeWidth={2} aria-hidden />
                  Trang phục mới: {o.name}
                </li>
              ))}
              {gains.newTricks.map((t) => (
                <li key={t.id} className="flex items-center gap-2 rounded-md bg-c-mint-soft px-3 py-2 font-semibold text-c-mint-fg">
                  <Sparkles className="size-4 shrink-0" strokeWidth={2} aria-hidden />
                  Trò mới: {t.name}
                </li>
              ))}
            </ul>
          )}
          <Button type="button" variant="pressable" size="xl" autoFocus onClick={() => {
              setLevelUp(false);
              setSettled(true);
            }}>
            Tuyệt vời!
          </Button>
        </DialogContent>
      </Dialog>
    </section>
  );
}
