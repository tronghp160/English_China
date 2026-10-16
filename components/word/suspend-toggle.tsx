"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { toast } from "sonner";
import { SwitchRow } from "@/components/settings/study-prefs";
import { bulkWords } from "@/lib/actions/words";

/** "Tạm ẩn" a word from reviews (per user). */
export function SuspendToggle({ wordId, deckId, suspended }: { wordId: string; deckId: string; suspended: boolean }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  return (
    <div className="mt-3">
      <SwitchRow
        id="suspend-word"
        label="Tạm ẩn khỏi ôn tập"
        hint="Từ vẫn nằm trong bộ nhưng không xuất hiện khi ôn."
        checked={suspended}
        onCheckedChange={(v) =>
          !pending &&
          start(async () => {
            const res = await bulkWords(deckId, { action: "suspend", wordIds: [wordId], suspended: v });
            if (!res.ok) return void toast.error(res.error);
            toast.success(v ? "Đã tạm ẩn từ" : "Đã bỏ ẩn từ");
            router.refresh();
          })
        }
      />
    </div>
  );
}
