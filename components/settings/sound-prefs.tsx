"use client";

import { Volume2 } from "lucide-react";
import { useOptimistic, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { updatePrefs } from "@/lib/actions/profile";
import { haptic } from "@/lib/haptics";
import { playSfx, setSfxEnabled } from "@/lib/sfx";
import type { Prefs } from "@/lib/validation";
import { SwitchRow } from "./study-prefs";

/** Sound and vibration switches (REDESIGN_V3 §3.4) with a button to hear what a right answer sounds like. */
export function SoundPrefs({ prefs }: { prefs: Required<Prefs> }) {
  const [optimistic, setOptimistic] = useOptimistic(prefs);
  const [, startTransition] = useTransition();

  function save(patch: Prefs) {
    startTransition(async () => {
      setOptimistic({ ...optimistic, ...patch });
      const res = await updatePrefs(patch);
      if (!res.ok) toast.error(res.error);
    });
  }

  function trySound() {
    // The switch may have just been flipped and the layout not re-rendered yet.
    setSfxEnabled(optimistic.sound);
    playSfx("correct");
    haptic("success");
  }

  return (
    <div className="divide-y divide-border">
      <SwitchRow
        id="pref-sound"
        label="Âm thanh"
        hint="Tiếng “ting” khi trả lời đúng, nhạc nhỏ khi xong phiên."
        checked={optimistic.sound}
        onCheckedChange={(v) => {
          setSfxEnabled(v);
          if (v) playSfx("pop");
          save({ sound: v });
        }}
      />
      <SwitchRow
        id="pref-haptics"
        label="Rung"
        hint="Rung nhẹ khi trả lời trên điện thoại có hỗ trợ."
        checked={optimistic.haptics}
        onCheckedChange={(v) => save({ haptics: v })}
      />
      <div className="py-3">
        <Button type="button" variant="outline" onClick={trySound} disabled={!optimistic.sound && !optimistic.haptics}>
          <Volume2 aria-hidden /> Nghe thử
        </Button>
      </div>
    </div>
  );
}
