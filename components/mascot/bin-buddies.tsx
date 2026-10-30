"use client";

import { useEffect, useState, useTransition } from "react";
import { Check, ChevronLeft, Loader2, PawPrint, Pencil, Sparkles } from "lucide-react";
import {
  hatchBuddy,
  renameBuddy,
  setActiveBuddy,
  syncBuddies,
  type BuddiesData,
  type BuddySpecies,
} from "@/lib/actions/bin-buddies";
import { buddyBySpecies } from "@/lib/bin/buddies";
import { type BinAction, type LineKey } from "@/lib/mascot/lines";
import { haptic } from "@/lib/haptics";
import { playSfx } from "@/lib/sfx";
import { cn } from "@/lib/utils";
import { fireConfetti } from "@/components/fx/confetti";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Buddy } from "./buddy";
import { Egg } from "./egg";
import { Pup } from "./pup";

export function BinBuddies({
  name,
  onBack,
  activeBuddy,
  onActiveBuddyChange,
  playBin,
  speak,
  onBuddiesChange,
}: {
  name: string;
  onBack: () => void;
  activeBuddy: BuddySpecies | null;
  onActiveBuddyChange?: (sp: BuddySpecies | null) => void;
  playBin?: (action: BinAction) => void;
  speak?: (key: LineKey) => void;
  onBuddiesChange?: (data: BuddiesData) => void;
}) {
  const [data, setData] = useState<BuddiesData | null>(null);
  const [loading, setLoading] = useState(true);
  const [eggTaps, setEggTaps] = useState<Record<string, number>>({});
  const [editingSpecies, setEditingSpecies] = useState<BuddySpecies | null>(null);
  const [editName, setEditName] = useState("");
  const [hatchingSpecies, setHatchingSpecies] = useState<BuddySpecies | null>(null);
  const [isPending, startTransition] = useTransition();

  // Load buddies on mount
  useEffect(() => {
    let cancelled = false;
    void syncBuddies().then((res) => {
      if (cancelled) return;
      setLoading(false);
      if (res.ok) {
        setData(res.data);
        onBuddiesChange?.(res.data);
        if (res.data.active !== undefined) {
          onActiveBuddyChange?.(res.data.active);
        }
        // If there's an egg ready, speak eggReady
        const hasReady = res.data.buddies.some((b) => b.hatch?.ready);
        if (hasReady && speak) {
          speak("eggReady");
        }
      }
    });
    return () => {
      cancelled = true;
    };
  }, [name, onActiveBuddyChange, onBuddiesChange, speak]);

  const handleTapEgg = (species: BuddySpecies) => {
    const current = eggTaps[species] ?? 0;
    const next = current + 1;
    setEggTaps((prev) => ({ ...prev, [species]: next }));
    haptic("light");
    playSfx("pop");

    if (next >= 3) {
      // Trigger hatching
      startTransition(async () => {
        const res = await hatchBuddy({ species });
        if (res.ok) {
          setData(res.data);
          onBuddiesChange?.(res.data);
          if (res.data.active) {
            onActiveBuddyChange?.(res.data.active);
          }
          setHatchingSpecies(species);
          setEggTaps((prev) => ({ ...prev, [species]: 0 }));
          void fireConfetti("big");
          playBin?.("dance");
          speak?.("hatched");
        }
      });
    }
  };

  const handleSetActive = (species: BuddySpecies | null) => {
    startTransition(async () => {
      const res = await setActiveBuddy({ species });
      if (res.ok) {
        onActiveBuddyChange?.(res.data.active);
        if (data) {
          const nextData = { ...data, active: res.data.active };
          setData(nextData);
          onBuddiesChange?.(nextData);
        }
        playSfx("pop");
        if (species) {
          speak?.("buddyHello");
        }
      }
    });
  };

  const handleSaveRename = (species: BuddySpecies) => {
    if (!editName.trim()) {
      setEditingSpecies(null);
      return;
    }
    startTransition(async () => {
      const res = await renameBuddy({ species, name: editName.trim() });
      if (res.ok) {
        setData(res.data);
        onBuddiesChange?.(res.data);
        setEditingSpecies(null);
        playSfx("correct");
      }
    });
  };

  const currentActive = data?.active ?? activeBuddy;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-border pb-3">
        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={onBack}
            aria-label="Quay lại"
            className="size-9"
          >
            <ChevronLeft className="size-5" />
          </Button>
          <div className="flex items-center gap-2">
            <PawPrint className="size-5 text-c-coral-fg" aria-hidden="true" />
            <h2 className="font-display text-lg font-bold">Bạn nhỏ cùng nhà</h2>
          </div>
        </div>
        {loading && <Loader2 className="size-4 animate-spin text-fg-muted" />}
      </div>

      <p className="text-xs text-fg-muted">
        Học đều đặn để nhận trứng và đồng hành cùng {name}. Chạm vào trứng đã sẵn sàng 3 lần để nở!
      </p>

      {/* Buddies list */}
      {loading && !data ? (
        <div className="flex min-h-[220px] items-center justify-center">
          <Loader2 className="size-6 animate-spin text-fg-muted" />
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {data?.buddies.map((b) => {
            const def = buddyBySpecies(b.species)!;
            const isEditing = editingSpecies === b.species;
            const isCurrentActive = currentActive === b.species;
            const taps = eggTaps[b.species] ?? 0;

            if (b.state === "locked") {
              const target = def.egg.count;
              const pct = Math.min(100, Math.round((b.mastered / target) * 100));

              return (
                <div
                  key={b.species}
                  className="flex flex-col justify-between rounded-xl border border-dashed border-border bg-surface-2/60 p-4"
                >
                  <div className="flex items-center gap-3">
                    <div className="flex size-14 shrink-0 items-center justify-center rounded-xl bg-surface-3/50">
                      <Buddy species={b.species} size={48} className="opacity-25 grayscale" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <h4 className="font-bold text-fg-muted">???</h4>
                      <p className="text-xs text-fg-muted">{b.condition}</p>
                    </div>
                  </div>
                  <div className="mt-3">
                    <div className="flex justify-between text-xs font-semibold text-fg-muted">
                      <span>Tiến độ nhận trứng</span>
                      <span>
                        {b.mastered} / {target}
                      </span>
                    </div>
                    <div className="mt-1 h-2 w-full overflow-hidden rounded-full bg-surface-3">
                      <div
                        className="h-full rounded-full bg-fg-muted/40 transition-all"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                </div>
              );
            }

            if (b.state === "egg") {
              const hatch = b.hatch ?? { done: 0, need: def.hatchCorrect, ready: false };
              const pct = Math.min(100, Math.round((hatch.done / hatch.need) * 100));
              const remaining = Math.max(0, hatch.need - hatch.done);

              return (
                <div
                  key={b.species}
                  className={cn(
                    "flex flex-col justify-between rounded-xl border p-4 transition-colors",
                    hatch.ready
                      ? "border-c-coral bg-c-coral-soft/40 shadow-xs"
                      : "border-border bg-surface",
                  )}
                >
                  <div className="flex items-center gap-3">
                    <div className="flex size-16 shrink-0 items-center justify-center">
                      <Egg
                        species={b.species}
                        progress={hatch.done / hatch.need}
                        ready={hatch.ready}
                        size={52}
                        onTap={hatch.ready ? () => handleTapEgg(b.species) : undefined}
                      />
                    </div>
                    <div className="min-w-0 flex-1">
                      <h4 className="font-bold text-fg">Trứng {def.defaultName}</h4>
                      {hatch.ready ? (
                        <div className="space-y-1">
                          <p className="text-xs font-bold text-c-coral-fg">Sẵn sàng nở!</p>
                          <p className="text-[11px] text-fg-muted">
                            Chạm vào trứng 3 lần ({Math.max(0, 3 - taps)} lần nữa)
                          </p>
                        </div>
                      ) : (
                        <p className="text-xs text-fg-muted">Còn {remaining} câu đúng để nở</p>
                      )}
                    </div>
                  </div>

                  {!hatch.ready && (
                    <div className="mt-3">
                      <div className="flex justify-between text-xs font-semibold text-fg-muted">
                        <span>Ấp trứng</span>
                        <span>
                          {hatch.done} / {hatch.need}
                        </span>
                      </div>
                      <div className="mt-1 h-2 w-full overflow-hidden rounded-full bg-surface-3">
                        <div
                          className="h-full rounded-full bg-c-coral transition-all"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  )}

                  {hatch.ready && (
                    <Button
                      type="button"
                      size="sm"
                      variant="pressable"
                      className="mt-3 w-full bg-c-coral text-white hover:bg-c-coral/90"
                      disabled={isPending}
                      onClick={() => handleTapEgg(b.species)}
                    >
                      {taps === 0 ? "Chạm để ấp nở" : `Chạm lần ${taps + 1}`}
                    </Button>
                  )}
                </div>
              );
            }

            // state === "hatched"
            return (
              <div
                key={b.species}
                className={cn(
                  "flex flex-col justify-between rounded-xl border p-4 shadow-sm transition-colors",
                  isCurrentActive
                    ? "border-primary bg-primary-soft/30"
                    : "border-border bg-surface",
                )}
              >
                <div className="flex items-center gap-3">
                  <div className="flex size-14 shrink-0 items-center justify-center rounded-xl bg-surface-2">
                    <Buddy species={b.species} mood={isCurrentActive ? "cheer" : "happy"} size={52} />
                  </div>
                  <div className="min-w-0 flex-1">
                    {isEditing ? (
                      <div className="flex items-center gap-1.5">
                        <input
                          type="text"
                          value={editName}
                          maxLength={20}
                          onChange={(e) => setEditName(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") handleSaveRename(b.species);
                            if (e.key === "Escape") setEditingSpecies(null);
                          }}
                          className="w-full rounded-md border border-primary bg-surface px-2 py-1 text-xs font-bold text-fg focus:outline-none"
                          autoFocus
                        />
                        <Button
                          size="icon"
                          variant="ghost"
                          className="size-7"
                          onClick={() => handleSaveRename(b.species)}
                          aria-label="Lưu tên"
                        >
                          <Check className="size-3.5 text-success-fg" />
                        </Button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-1.5">
                        <h4 className="truncate font-bold text-fg">{b.name}</h4>
                        <button
                          type="button"
                          onClick={() => {
                            setEditingSpecies(b.species);
                            setEditName(b.name);
                          }}
                          aria-label={`Đổi tên ${b.name}`}
                          className="text-fg-muted hover:text-fg"
                        >
                          <Pencil className="size-3" />
                        </button>
                      </div>
                    )}
                    <p className="text-xs text-fg-muted">{def.defaultName}</p>
                  </div>
                </div>

                <div className="mt-3 flex items-center justify-between gap-2 pt-1">
                  {isCurrentActive ? (
                    <Button
                      type="button"
                      size="sm"
                      variant="soft"
                      tone="mint"
                      className="w-full"
                      disabled={isPending}
                      onClick={() => handleSetActive(null)}
                    >
                      <Sparkles className="size-3.5" />
                      Đang đi cùng
                    </Button>
                  ) : (
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      className="w-full"
                      disabled={isPending}
                      onClick={() => handleSetActive(b.species)}
                    >
                      Đi cùng {name}
                    </Button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Hatching Modal Animation Dialog */}
      {hatchingSpecies && (
        <HatchDialog
          species={hatchingSpecies}
          name={name}
          open={Boolean(hatchingSpecies)}
          onClose={(finalName) => {
            if (finalName && finalName !== buddyBySpecies(hatchingSpecies)?.defaultName) {
              void renameBuddy({ species: hatchingSpecies, name: finalName }).then((res) => {
                if (res.ok) {
                  setData(res.data);
                  onBuddiesChange?.(res.data);
                }
              });
            }
            setHatchingSpecies(null);
          }}
        />
      )}
    </div>
  );
}

function HatchDialog({
  species,
  name,
  open,
  onClose,
}: {
  species: BuddySpecies;
  name: string;
  open: boolean;
  onClose: (finalName?: string) => void;
}) {
  const def = buddyBySpecies(species)!;
  const [chosenName, setChosenName] = useState(def.defaultName);
  const [stage, setStage] = useState<"cracking" | "hatched">("cracking");

  useEffect(() => {
    const timer = setTimeout(() => {
      setStage("hatched");
    }, 450);
    return () => clearTimeout(timer);
  }, []);

  return (
    <Dialog open={open} onOpenChange={() => onClose(chosenName)}>
      <DialogContent className="max-w-sm text-center">
        <DialogHeader>
          <DialogTitle className="font-display text-xl font-extrabold">
            {stage === "cracking" ? "Trứng đang nở..." : `Chào ${def.defaultName}!`}
          </DialogTitle>
          <DialogDescription>
            {stage === "cracking"
              ? "Hãy nhìn xem ai bước ra nào!"
              : `${name} đã có bạn đồng hành mới rồi.`}
          </DialogDescription>
        </DialogHeader>

        <div className="my-6 flex flex-col items-center justify-center">
          {stage === "cracking" ? (
            <div className="egg-wobble">
              <Egg species={species} progress={1} ready size={96} />
            </div>
          ) : (
            <div className="flex items-end justify-center gap-4">
              <Pup mood="cheer" action="dance" size={84} animated />
              <div className="animate-pop">
                <Buddy species={species} mood="cheer" size={84} />
              </div>
            </div>
          )}
        </div>

        {stage === "hatched" && (
          <div className="space-y-4">
            <div className="space-y-1.5 text-left">
              <label htmlFor="buddy-name-input" className="text-xs font-semibold text-fg-muted">
                Đặt tên cho bạn nhỏ
              </label>
              <input
                id="buddy-name-input"
                type="text"
                maxLength={20}
                value={chosenName}
                onChange={(e) => setChosenName(e.target.value)}
                className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm font-semibold text-fg focus:border-primary focus:outline-none"
              />
            </div>
            <Button
              type="button"
              className="w-full"
              variant="pressable"
              onClick={() => onClose(chosenName.trim() || def.defaultName)}
            >
              Xong
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
