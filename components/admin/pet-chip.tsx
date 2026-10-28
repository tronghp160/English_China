import { OutfitIcon } from "@/components/mascot/outfits";
import type { OutfitId } from "@/lib/progress";

export function PetChip({
  level,
  outfit,
  outfitName,
  streak,
  className = "",
}: {
  level: number;
  outfit: OutfitId;
  outfitName?: string;
  streak: number;
  className?: string;
}) {
  const showOutfit = outfit !== "none";
  const name = outfitName && outfitName !== "Không mặc" ? outfitName : null;

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full bg-surface-2 px-2.5 py-0.5 text-xs text-fg-muted ${className}`}
    >
      {showOutfit && <OutfitIcon outfit={outfit} size={16} />}
      <span className="font-medium text-fg">Cấp {level}</span>
      {name && <span>· {name}</span>}
      <span>· Chuỗi {streak} ngày</span>
    </span>
  );
}
