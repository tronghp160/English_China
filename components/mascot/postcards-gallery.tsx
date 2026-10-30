"use client";

import { useState } from "react";
import Link from "next/link";
import { ChevronLeft, Volume2, X } from "lucide-react";
import { Dialog as DialogPrimitive } from "radix-ui";
import { DialogOverlay, DialogPortal } from "@/components/ui/dialog";
import type { TripPlace } from "@/lib/bin/places";
import type { BinStory } from "@/lib/bin/trip";
import type { LangCode } from "@/lib/lang/types";
import { speak as speakTts, ttsSupported } from "@/lib/tts";
import { cn } from "@/lib/utils";
import { Landmark } from "./landmarks";
import { Postcard } from "./postcard";

export type CollectedTripRow = {
  id: string;
  place_id: string;
  lang: LangCode;
  study_day: string;
  word_term: string | null;
  story: unknown;
};

export function PostcardsGallery({
  name,
  places,
  trips,
}: {
  name: string;
  places: TripPlace[];
  trips: CollectedTripRow[];
}) {
  const [filter, setFilter] = useState<"all" | "en" | "zh">("all");
  const [selectedTrip, setSelectedTrip] = useState<CollectedTripRow | null>(null);

  // Map trips by place_id (latest trip for that place)
  const tripByPlace = new Map<string, CollectedTripRow>();
  for (const t of trips) {
    if (!tripByPlace.has(t.place_id)) {
      tripByPlace.set(t.place_id, t);
    }
  }

  const collectedCount = tripByPlace.size;

  const filteredPlaces = places.filter((p) => {
    if (filter === "en") return p.lang === "en";
    if (filter === "zh") return p.lang === "zh";
    return true;
  });

  const story = selectedTrip?.story as BinStory | null;

  function handleTts() {
    if (!story || !selectedTrip) return;
    const text = story.lines.map((l) => l.target).join(" ");
    speakTts(text, selectedTrip.lang);
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-3">
          <Link
            href="/today"
            aria-label="Quay lại Hôm nay"
            className="grid size-11 shrink-0 place-items-center rounded-full bg-surface-2 text-fg-muted transition-colors hover:bg-surface-3 active:scale-95"
          >
            <ChevronLeft className="size-5" aria-hidden />
          </Link>
          <div className="flex flex-col">
            <h1 className="text-2xl font-extrabold tracking-tight text-fg">Bưu thiếp của {name}</h1>
            <p className="text-sm font-semibold text-fg-muted">
              Đã sưu tầm {collectedCount}/24 nơi
            </p>
          </div>
        </div>

        {/* Filter chips */}
        <div className="mt-2 flex gap-2">
          {(
            [
              { id: "all", label: "Tất cả (24)" },
              { id: "en", label: "Tiếng Anh (12)" },
              { id: "zh", label: "Tiếng Trung (12)" },
            ] as const
          ).map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setFilter(t.id)}
              className={cn(
                "min-h-11 rounded-full px-4 text-sm font-bold transition-colors",
                filter === t.id
                  ? "bg-primary-soft text-primary-fg"
                  : "bg-surface-2 text-fg-muted hover:bg-surface-3",
              )}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* Grid of 24 places */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        {filteredPlaces.map((place) => {
          const trip = tripByPlace.get(place.id);
          if (trip) {
            return (
              <button
                key={place.id}
                type="button"
                onClick={() => setSelectedTrip(trip)}
                className="group text-left transition-transform active:scale-95"
              >
                <Postcard
                  placeId={place.id}
                  day={trip.study_day}
                  word={trip.word_term}
                  size="sm"
                  className="w-full group-hover:border-primary"
                />
              </button>
            );
          }

          return (
            <div
              key={place.id}
              className="relative flex h-[104px] flex-col items-center justify-center rounded-[18px] border-2 border-dashed border-border-strong bg-surface-2/40 p-2.5 opacity-50 grayscale select-none"
            >
              <div className="size-9 opacity-40">
                <Landmark id={place.id} />
              </div>
              <span className="mt-1 text-xs font-extrabold tracking-widest text-fg-muted">???</span>
            </div>
          );
        })}
      </div>

      {/* Detail Dialog */}
      {selectedTrip && (
        <DialogPrimitive.Root open={Boolean(selectedTrip)} onOpenChange={(open) => !open && setSelectedTrip(null)}>
          <DialogPortal>
            <DialogOverlay />
            <DialogPrimitive.Content
              aria-describedby={undefined}
              className={cn(
                "fixed inset-x-4 top-1/2 z-50 flex max-h-[85dvh] max-w-md -translate-y-1/2 flex-col gap-4 overflow-y-auto rounded-2xl bg-surface p-5 shadow-lg outline-none sm:inset-x-auto sm:left-1/2 sm:-translate-x-1/2",
                "data-open:animate-in data-open:zoom-in-95 data-closed:animate-out data-closed:zoom-out-95",
              )}
            >
              <div className="flex items-center justify-between">
                <DialogPrimitive.Title className="text-base font-extrabold text-fg">
                  Bưu thiếp kỷ niệm
                </DialogPrimitive.Title>
                <DialogPrimitive.Close
                  aria-label="Đóng"
                  className="grid size-9 shrink-0 place-items-center rounded-full bg-surface-2 text-fg-muted transition-colors hover:bg-surface-3"
                >
                  <X className="size-4" aria-hidden />
                </DialogPrimitive.Close>
              </div>

              <Postcard
                placeId={selectedTrip.place_id}
                day={selectedTrip.study_day}
                word={selectedTrip.word_term}
                size="md"
              />

              {story && (
                <div className="flex flex-col gap-2 rounded-xl bg-surface-2 p-3.5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-extrabold uppercase tracking-wider text-fg-muted">
                      Chuyện của {name}
                    </span>
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
                    {story.lines.map((l, i) => (
                      <div key={i} className="flex flex-col">
                        <p className="text-sm font-bold text-fg">{l.target}</p>
                        {story?.pinyin?.[i] && (
                          <p className="font-mono text-xs text-primary">{story.pinyin[i]}</p>
                        )}
                        <p className="text-xs text-fg-muted">{l.vi}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </DialogPrimitive.Content>
          </DialogPortal>
        </DialogPrimitive.Root>
      )}
    </div>
  );
}
