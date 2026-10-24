"use client";

import { Bone, CalendarCheck, Check, Gift, Target, BookPlus, type LucideIcon } from "lucide-react";
import { useCallback, useState } from "react";
import { toast } from "sonner";
import { BONE_ARRIVE_EVENT, BONE_TARGET_ATTR, useXpArrive, XpBurst } from "@/components/fx/xp-burst";
import { fireConfetti } from "@/components/fx/confetti";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { IconTile } from "@/components/ui/icon-tile";
import { claimQuest } from "@/lib/actions/bin";
import { haptic } from "@/lib/haptics";
import { QUEST_BONES, type Quest, type QuestId } from "@/lib/progress";
import { playSfx } from "@/lib/sfx";
import { TONE_CLASSES, type Tone } from "@/lib/tone";
import { cn } from "@/lib/utils";

const LOOK: Record<QuestId, { icon: LucideIcon; tone: Tone }> = {
  due: { icon: CalendarCheck, tone: "blue" },
  correct20: { icon: Target, tone: "mint" },
  new5: { icon: BookPlus, tone: "orange" },
};

export type QuestView = Quest & { claimed: boolean };

/**
 * "Nhiệm vụ hôm nay" (REDESIGN_V3 §6.1): three small goals with a bar each. A finished one shows a gift button;
 * taking it opens the gift (sound, confetti) and the bones fly to the bone chip. The server checks the quest again.
 */
export function QuestCard({ quests, bones: initialBones }: { quests: QuestView[]; bones: number }) {
  const [taken, setTaken] = useState<Set<QuestId>>(() => new Set(quests.filter((q) => q.claimed).map((q) => q.id)));
  const [bones, setBones] = useState(initialBones);
  const [pending, setPending] = useState<QuestId | null>(null);
  const [flight, setFlight] = useState<{ id: QuestId; n: number } | null>(null);
  const [bump, setBump] = useState(0);
  useXpArrive(
    useCallback(() => setBump((b) => b + 1), []),
    BONE_ARRIVE_EVENT,
  );

  const doneCount = quests.filter((q) => q.done).length;
  const allTaken = quests.every((q) => taken.has(q.id));

  async function claim(id: QuestId) {
    if (pending) return;
    setPending(id);
    const res = await claimQuest(id);
    setPending(null);
    if (!res.ok) {
      toast.error(res.error);
      return;
    }
    setTaken((t) => new Set(t).add(id));
    setBones(res.data.bones);
    setFlight((f) => ({ id, n: (f?.n ?? 0) + 1 }));
    playSfx("levelUp");
    haptic("success");
    void fireConfetti("small");
  }

  return (
    <Card className="p-5" aria-labelledby="quests-title" role="region">
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <h2 id="quests-title" className="text-lg">
          Nhiệm vụ hôm nay
        </h2>
        <span className="rounded-full bg-surface-2 px-2.5 py-0.5 text-sm font-bold tabular-nums text-fg-muted">
          {doneCount}/{quests.length}
        </span>
        <span
          key={bump}
          data-bone-counter=""
          className={cn(
            "ml-auto inline-flex items-center gap-1.5 rounded-full bg-streak-soft px-3 py-1 text-sm font-extrabold text-streak-fg tabular-nums",
            bump > 0 && "animate-pop",
          )}
        >
          <Bone className="size-4" aria-hidden />
          <span className="sr-only">Xương: </span>
          {bones}
        </span>
      </div>

      <ul className="grid gap-3 md:grid-cols-3">
        {quests.map((q) => {
          const { icon, tone } = LOOK[q.id];
          const t = TONE_CLASSES[tone];
          const isTaken = taken.has(q.id);
          const pct = Math.min(100, Math.round((q.progress / q.target) * 100));
          return (
            <li key={q.id} className={cn("relative flex flex-col gap-3 rounded-lg p-4", t.soft)}>
              <div className="flex items-center gap-3">
                <IconTile icon={q.done ? Check : icon} tone={tone} size={40} solid />
                <h3 className={cn("text-[0.9375rem] leading-snug font-bold", t.fg)}>{q.title}</h3>
              </div>
              <div className="flex items-center gap-2.5">
                <div
                  className="h-2 flex-1 overflow-hidden rounded-full bg-surface/70"
                  role="progressbar"
                  aria-label={q.title}
                  aria-valuemin={0}
                  aria-valuemax={q.target}
                  aria-valuenow={q.progress}
                >
                  <div className={cn("h-full rounded-full transition-[width] duration-500", t.bar)} style={{ width: `${pct}%` }} />
                </div>
                <span className={cn("text-sm font-bold tabular-nums", t.fg)}>{q.done ? "Xong" : `${q.progress}/${q.target}`}</span>
              </div>
              {q.done && (
                <div className="relative">
                  {isTaken ? (
                    <p className={cn("flex min-h-11 items-center gap-1.5 text-sm font-bold", t.fg)}>
                      <Check className="size-4" aria-hidden /> Đã nhận {QUEST_BONES} xương
                    </p>
                  ) : (
                    <Button type="button" variant="pressable" size="sm" className="min-h-11 w-full" disabled={pending !== null} onClick={() => void claim(q.id)}>
                      <Gift className={cn(pending === q.id && "animate-shake")} aria-hidden />
                      Nhận {QUEST_BONES} xương
                    </Button>
                  )}
                  <XpBurst trigger={flight?.id === q.id ? flight.n : 0} amount={QUEST_BONES} unit="xương" target={BONE_TARGET_ATTR} arriveEvent={BONE_ARRIVE_EVENT} className="top-1/2 right-1/2" />
                </div>
              )}
            </li>
          );
        })}
      </ul>
      {allTaken && <p className="mt-3 text-sm text-fg-muted">Xong hết rồi. Mai có nhiệm vụ mới.</p>}
    </Card>
  );
}
