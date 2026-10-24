"use client";

import { Lock } from "lucide-react";
import { useOptimistic, useState, useTransition } from "react";
import { toast } from "sonner";
import { OutfitIcon } from "@/components/mascot/outfits";
import { Pup } from "@/components/mascot/pup";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { setBinOutfit } from "@/lib/actions/bin";
import { updatePrefs } from "@/lib/actions/profile";
import { PUP_MOODS } from "@/lib/mascot/lines";
import { OUTFITS, outfitCondition, type OutfitId } from "@/lib/progress";
import { cn } from "@/lib/utils";
import type { Prefs } from "@/lib/validation";
import { SwitchRow } from "./study-prefs";

/** Puppy mascot on/off and its name. */
export function MascotPrefs({
  prefs,
  unlockedOutfits,
}: {
  prefs: Required<Prefs>;
  unlockedOutfits: OutfitId[];
}) {
  const [optimistic, setOptimistic] = useOptimistic(prefs);
  const [name, setName] = useState(prefs.mascot_name);
  const [moodIndex, setMoodIndex] = useState(1);
  const [outfit, setOutfit] = useState<string>(prefs.bin_outfit);
  const [, startTransition] = useTransition();

  function save(patch: Prefs) {
    startTransition(async () => {
      setOptimistic({ ...optimistic, ...patch });
      const res = await updatePrefs(patch);
      if (!res.ok) toast.error(res.error);
    });
  }

  function chooseOutfit(id: OutfitId) {
    if (id === outfit) return;
    const before = outfit;
    setOutfit(id);
    startTransition(async () => {
      const res = await setBinOutfit(id);
      if (!res.ok) {
        setOutfit(before);
        toast.error(res.error);
      }
    });
  }

  function saveName() {
    const v = name.trim();
    if (!v || v.length > 20) {
      setName(optimistic.mascot_name);
      toast.error("Tên bạn cún cần 1–20 ký tự.");
      return;
    }
    if (v !== optimistic.mascot_name) save({ mascot_name: v });
  }

  return (
    <div className="space-y-5">
      <div className="flex items-start gap-4">
        <div className="flex shrink-0 flex-col items-center gap-1">
          <button
            type="button"
            aria-label="Xem biểu cảm tiếp theo"
            title="Bấm để xem biểu cảm khác"
            onClick={() => setMoodIndex((i) => (i + 1) % PUP_MOODS.length)}
            className="grid size-28 cursor-pointer place-items-center rounded-lg border border-border bg-surface"
          >
            <Pup
              key={moodIndex}
              mood={optimistic.mascot ? PUP_MOODS[moodIndex] : "sleepy"}
              size={84}
              outfit={outfit}
            />
          </button>
          <span className="text-xs text-fg-muted">Bấm để đổi</span>
        </div>
        <div className="min-w-0 flex-1 divide-y divide-border">
          <SwitchRow
            id="pref-mascot"
            label="Hiện bạn cún"
            hint="Cổ vũ ở trang Hôm nay, khi ôn tập và lúc xong phiên."
            checked={optimistic.mascot}
            onCheckedChange={(v) => save({ mascot: v })}
          />
          <div className="flex flex-col gap-1.5 py-3">
            <Label htmlFor="pref-mascot-name">Tên bạn cún</Label>
            <Input
              id="pref-mascot-name"
              maxLength={20}
              value={name}
              disabled={!optimistic.mascot}
              onChange={(e) => setName(e.target.value)}
              onBlur={saveName}
              onKeyDown={(e) => {
                if (e.key === "Enter") e.currentTarget.blur();
              }}
            />
          </div>
        </div>
      </div>

      <div className="space-y-2">
        <p className="text-[0.9375rem] font-semibold text-fg">
          Trang phục của {optimistic.mascot_name}
        </p>
        <p className="text-sm text-fg-muted">
          Mở thêm khi học đều ngày và lên cấp. Bin mặc bộ này ở mọi nơi trong app.
        </p>
        <div className="flex flex-wrap gap-2" role="group" aria-label="Trang phục">
          {OUTFITS.map((o) => {
            const unlocked = unlockedOutfits.includes(o.id);
            const worn = outfit === o.id;
            const need = outfitCondition(o);
            return (
              <button
                key={o.id}
                type="button"
                disabled={!unlocked}
                aria-pressed={unlocked ? worn : undefined}
                aria-label={
                  unlocked
                    ? `${o.name}${worn ? ", đang mặc" : ""}`
                    : `${o.name}, mở khi ${need?.toLowerCase()}`
                }
                onClick={() => chooseOutfit(o.id)}
                className={cn(
                  "grid size-16 place-items-center rounded-md border-2 transition-colors",
                  worn
                    ? "border-primary bg-primary-soft"
                    : unlocked
                      ? "border-border bg-surface hover:bg-surface-2"
                      : "border-surface-2 bg-surface-2 text-fg-muted",
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
    </div>
  );
}
