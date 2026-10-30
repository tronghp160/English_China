"use client";

import { useEffect } from "react";
import { Footprints } from "lucide-react";
import { IconTile } from "@/components/ui/icon-tile";
import { useBinHome } from "@/components/mascot/bin-home-provider";

export function TodayTripBackCard({ name }: { name: string }) {
  const home = useBinHome();

  return (
    <div className="flex items-center justify-between rounded-2xl border border-c-grape/40 bg-c-grape-soft/70 p-4 shadow-xs">
      <div className="flex items-center gap-3">
        <IconTile icon={Footprints} tone="grape" size={44} />
        <div className="flex flex-col">
          <span className="text-sm font-extrabold text-fg">{name} về rồi!</span>
          <span className="text-xs font-semibold text-fg-muted">Có bưu thiếp cho bạn.</span>
        </div>
      </div>
      <button
        type="button"
        onClick={() => home?.open("trip")}
        className="inline-flex min-h-11 items-center justify-center rounded-full bg-primary px-5 text-sm font-bold text-on-primary shadow-primary transition-transform active:scale-95"
      >
        Đón {name}
      </button>
    </div>
  );
}

export function TodayTripAwayCard({
  name,
  placeName,
  returnsAt,
  timeZone,
}: {
  name: string;
  placeName: string;
  returnsAt: string;
  timeZone: string;
}) {
  const timeStr = new Intl.DateTimeFormat("vi-VN", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone,
  }).format(new Date(returnsAt));

  return (
    <div className="mt-2 flex items-center gap-2.5 rounded-xl bg-surface/90 px-3 py-2 text-xs font-bold text-fg shadow-2xs sm:text-sm">
      <IconTile icon={Footprints} tone="grape" size={32} />
      <span>
        {name} đang ở {placeName} · về lúc {timeStr}
      </span>
    </div>
  );
}

export function AutoOpenBin({ panel }: { panel: "main" | "decor" | "trip" | "buddies" }) {
  const home = useBinHome();
  useEffect(() => {
    home?.open(panel);
  }, [home, panel]);
  return null;
}
