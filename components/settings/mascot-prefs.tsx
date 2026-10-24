"use client";

import { useOptimistic, useState, useTransition } from "react";
import { toast } from "sonner";
import { Pup } from "@/components/mascot/pup";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { updatePrefs } from "@/lib/actions/profile";
import { PUP_MOODS } from "@/lib/mascot/lines";
import type { Prefs } from "@/lib/validation";
import { SwitchRow } from "./study-prefs";

/** Puppy mascot on/off and its name. */
export function MascotPrefs({ prefs }: { prefs: Required<Prefs> }) {
  const [optimistic, setOptimistic] = useOptimistic(prefs);
  const [name, setName] = useState(prefs.mascot_name);
  const [moodIndex, setMoodIndex] = useState(1);
  const [, startTransition] = useTransition();

  function save(patch: Prefs) {
    startTransition(async () => {
      setOptimistic({ ...optimistic, ...patch });
      const res = await updatePrefs(patch);
      if (!res.ok) toast.error(res.error);
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
    <div className="flex items-start gap-4">
      <div className="flex shrink-0 flex-col items-center gap-1">
        <button
          type="button"
          aria-label="Xem biểu cảm tiếp theo"
          title="Bấm để xem biểu cảm khác"
          onClick={() => setMoodIndex((i) => (i + 1) % PUP_MOODS.length)}
          className=" grid size-28 cursor-pointer place-items-center rounded-lg border border-border bg-surface"
        >
          <Pup key={moodIndex} mood={optimistic.mascot ? PUP_MOODS[moodIndex] : "sleepy"} size={84} />
        </button>
        <span className="text-xs text-fg-muted">Bấm để đổi</span>
      </div>
      <div className="divide-y divide-border min-w-0 flex-1">
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
  );
}
