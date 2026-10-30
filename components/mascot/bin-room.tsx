import type { JSX } from "react";
import type { RoomSlot } from "@/lib/bin/catalog";
import type { BuddySpecies } from "@/lib/bin/buddies";
import { cn } from "@/lib/utils";
import { Buddy } from "./buddy";
import { RoomItemArt } from "./room-items";

/**
 * The room: wall, window, name plate, floor, rug, bed, bowl, toy, wall art, corner decor.
 * Fully data-driven by `room` (PLAN-bin-3.md §1.3).
 */
export function BinRoom({
  night,
  name,
  room,
  preview,
  away,
  buddy,
}: {
  night: boolean;
  name: string;
  room: Record<RoomSlot, string>;
  /** A shop item shown in its spot before buying (not saved). */
  preview?: { slot: RoomSlot; itemId: string } | null;
  /** Bin is on a trip: the bed shows a note instead of Bin (see 1.7). */
  away?: { placeName: string; backAt: string } | null;
  /** Active companion buddy that stays in the room. */
  buddy?: BuddySpecies | null;
}): JSX.Element {
  const getItem = (slot: RoomSlot) => (preview && preview.slot === slot ? preview.itemId : room[slot]);
  const isPreview = (slot: RoomSlot) => Boolean(preview && preview.slot === slot);

  const wallItem = getItem("wall");
  const rugItem = getItem("rug");
  const bedItem = getItem("bed");
  const bowlItem = getItem("bowl");
  const toyItem = getItem("toy");
  const cornerItem = getItem("corner");

  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 select-none">
      {/* Window */}
      <div
        className={cn(
          "absolute top-[22px] left-[22px] h-20 w-[92px] overflow-hidden rounded-[14px] border-[5px] border-surface shadow-xs",
          night ? "bg-scene-window-night" : "bg-scene-window",
        )}
      >
        <span className="absolute inset-y-0 left-1/2 w-[5px] -translate-x-1/2 bg-surface" />
        {night ? (
          <span className="absolute top-3.5 left-3 size-[22px] rounded-full bg-c-sun-soft shadow-[inset_-6px_0_0_0_var(--scene-window-night)]" />
        ) : (
          <>
            <span className="absolute top-3.5 left-3 size-[22px] rounded-full bg-c-sun" />
            <span className="absolute right-2 bottom-3.5 h-3 w-[30px] rounded-full bg-surface" />
          </>
        )}
      </div>

      {/* Wall art (between window and name plate) */}
      <div
        className={cn(
          "absolute top-[34px] left-1/2 -translate-x-1/2 w-[70px]",
          isPreview("wall") && "outline-dashed outline-2 outline-primary rounded-md",
        )}
      >
        <RoomItemArt id={wallItem} />
      </div>

      {/* Name plate */}
      <div className="absolute top-[30px] right-6 grid h-[50px] w-[70px] place-items-center rounded-[10px] border-4 border-scene-frame bg-surface text-xs font-extrabold tracking-wide text-c-orange-fg">
        {name.slice(0, 5).toUpperCase()}
      </div>

      {/* Floor */}
      <div className="absolute inset-x-0 bottom-0 h-[92px] bg-scene-floor" />

      {/* Rug (z-index 1) */}
      <div
        className={cn(
          "absolute right-[18%] bottom-[22px] left-[18%] h-[46px]",
          isPreview("rug") && "outline-dashed outline-2 outline-primary rounded-md",
        )}
      >
        <RoomItemArt id={rugItem} />
      </div>

      {/* Bed (z-index 2, under Bin's feet) */}
      <div
        className={cn(
          "absolute bottom-[18px] left-1/2 -translate-x-1/2 w-[150px] lg:w-[190px]",
          isPreview("bed") && "outline-dashed outline-2 outline-primary rounded-md",
        )}
      >
        <RoomItemArt id={bedItem} />
        {away && (
          <div className="absolute bottom-2 left-1/2 -translate-x-1/2 w-8">
            <RoomItemArt id="note" />
          </div>
        )}
      </div>

      {/* Bowl */}
      <div
        className={cn(
          "absolute right-[26px] bottom-[26px] w-[54px]",
          isPreview("bowl") && "outline-dashed outline-2 outline-primary rounded-md",
        )}
      >
        <RoomItemArt id={bowlItem} />
      </div>

      {/* Toy */}
      <div
        className={cn(
          "absolute bottom-[22px] left-[22px] w-[40px]",
          isPreview("toy") && "outline-dashed outline-2 outline-primary rounded-md",
        )}
      >
        <RoomItemArt id={toyItem} />
      </div>

      {/* Corner decor */}
      <div
        className={cn(
          "absolute bottom-[70px] right-[6px] w-[44px] lg:bottom-[86px]",
          isPreview("corner") && "outline-dashed outline-2 outline-primary rounded-md",
        )}
      >
        <RoomItemArt id={cornerItem} />
      </div>

      {/* Active companion buddy */}
      {buddy && (
        <div
          className={cn(
            "pointer-events-auto absolute bottom-[24px] z-10",
            away
              ? "left-1/2 -translate-x-1/2"
              : "left-[14%] sm:left-[18%] lg:left-[22%]",
          )}
        >
          <Buddy
            species={buddy}
            mood={away ? "sleepy" : "happy"}
            size={64}
            className="size-[64px] lg:size-[84px]"
          />
        </div>
      )}
    </div>
  );
}
