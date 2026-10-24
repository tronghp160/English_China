"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { BIN_ACTION_NAMES, PUP_MOODS, type BinAction } from "@/lib/mascot/lines";
import { OUTFITS } from "@/lib/progress";
import { cn } from "@/lib/utils";
import { OutfitIcon } from "./outfits";
import { Pup } from "./pup";
import { useBinAction } from "./use-bin";

/** Everything about Bin in one place for the dev-only /dev-ui/bin page: moods, outfits, actions, looking, reduced motion. */
export function BinLab() {
  const [outfit, setOutfit] = useState("none");
  const [reduced, setReduced] = useState(false);
  const [follow, setFollow] = useState(true);
  const [size, setSize] = useState(200);
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
    </div>
  );
}
