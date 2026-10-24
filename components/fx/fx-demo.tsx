"use client";

import { Star } from "lucide-react";
import { useCallback, useState } from "react";
import { Burst, type BurstPalette } from "@/components/fx/burst";
import { ComboBadge, ComboBanner } from "@/components/fx/combo-badge";
import { fireConfetti, type ConfettiPreset } from "@/components/fx/confetti";
import { CountUp } from "@/components/fx/count-up";
import { PressScale } from "@/components/fx/press-scale";
import { Reveal } from "@/components/fx/reveal";
import { Shake } from "@/components/fx/shake";
import { useXpArrive, XpBurst } from "@/components/fx/xp-burst";
import { Button } from "@/components/ui/button";
import { haptic } from "@/lib/haptics";
import { playSfx, SFX_PLANS, type Sfx } from "@/lib/sfx";
import { cn } from "@/lib/utils";

const SOUNDS = Object.keys(SFX_PLANS) as Sfx[];
const PALETTES: BurstPalette[] = ["success", "sun", "rainbow", "cream"];
const PRESETS: ConfettiPreset[] = ["small", "big", "record"];

/** Every effect of components/fx on one panel, for the dev-only /dev-ui page (screenshots and manual checks). */
export function FxDemo() {
  const [burst, setBurst] = useState(0);
  const [palette, setPalette] = useState<BurstPalette>("success");
  const [xp, setXp] = useState(0);
  const [bump, setBump] = useState(0);
  const [flight, setFlight] = useState(0);
  const [shake, setShake] = useState(0);
  const [combo, setCombo] = useState(0);
  const [count, setCount] = useState(120);

  useXpArrive(useCallback(() => setBump((b) => b + 1), []));

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h3 className="text-sm font-bold text-fg-muted">Âm thanh (cần một cú chạm trước, tắt khi trình duyệt tự động)</h3>
        <div className="flex flex-wrap gap-2">
          {SOUNDS.map((s) => (
            <Button key={s} size="sm" variant="outline" onClick={() => playSfx(s, { combo })}>
              {s}
            </Button>
          ))}
          {(["light", "success", "error", "heavy"] as const).map((h) => (
            <Button key={h} size="sm" variant="soft" tone="grape" onClick={() => haptic(h)}>
              rung {h}
            </Button>
          ))}
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-4">
        <div className="relative">
          <Button
            variant="outline"
            onClick={() => {
              setBurst((b) => b + 1);
              playSfx("pop");
            }}
          >
            Burst
          </Button>
          <Burst trigger={burst} palette={palette} />
        </div>
        {PALETTES.map((p) => (
          <button
            key={p}
            type="button"
            onClick={() => setPalette(p)}
            className={cn("min-h-11 rounded-full px-3 text-sm font-semibold", palette === p ? "bg-primary-soft text-primary-fg" : "bg-surface-2 text-fg-muted")}
          >
            {p}
          </button>
        ))}
      </div>

      <div className="flex flex-wrap items-center gap-4">
        <span
          key={bump}
          data-xp-counter=""
          className={cn("inline-flex items-center gap-1 rounded-full bg-xp-soft px-3 py-1.5 font-extrabold text-xp-fg tabular-nums", bump > 0 && "animate-pop")}
        >
          <Star className="size-4 fill-c-grape" aria-hidden /> <CountUp value={xp} duration={400} />
        </span>
        <div className="relative">
          <Button
            variant="outline"
            onClick={() => {
              setXp((x) => x + 1);
              setFlight((f) => f + 1);
            }}
          >
            +1 XP bay lên
          </Button>
          <XpBurst trigger={flight} />
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-4">
        <Shake trigger={shake}>
          <Button variant="outline" onClick={() => setShake((s) => s + 1)}>
            Lắc (sai)
          </Button>
        </Shake>
        <PressScale>
          <div className="rounded-lg bg-surface-2 px-4 py-3 text-sm font-semibold">Nhấn vào đây (PressScale)</div>
        </PressScale>
      </div>

      <div className="space-y-2">
        <div className="flex flex-wrap items-center gap-3">
          <Button variant="soft" tone="sun" onClick={() => setCombo((c) => c + 1)}>
            Đúng thêm một câu
          </Button>
          <Button variant="outline" onClick={() => setCombo(0)}>
            Sai
          </Button>
          <ComboBadge combo={combo} />
          <span className="text-sm text-fg-muted tabular-nums">combo {combo}</span>
        </div>
        <ComboBanner combo={combo} className="min-h-12" />
      </div>

      <div className="flex flex-wrap items-center gap-3">
        {PRESETS.map((p) => (
          <Button key={p} variant="outline" onClick={() => void fireConfetti(p)}>
            Confetti {p}
          </Button>
        ))}
      </div>

      <div className="flex items-center gap-4">
        <span className="font-display text-3xl tabular-nums">
          <CountUp value={count} from={count - 40} />
        </span>
        <Button variant="outline" onClick={() => setCount((c) => c + 37)}>
          Đếm lên
        </Button>
      </div>

      <Reveal className="grid gap-2 sm:grid-cols-4">
        {["Một", "Hai", "Ba", "Bốn"].map((t) => (
          <div key={t} className="rounded-lg bg-surface-2 px-4 py-3 text-sm font-semibold">
            Reveal {t}
          </div>
        ))}
      </Reveal>
    </div>
  );
}
