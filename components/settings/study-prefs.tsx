"use client";

import { useOptimistic, useTransition } from "react";
import { toast } from "sonner";
import { Switch } from "@/components/ui/switch";
import { updatePrefs } from "@/lib/actions/profile";
import type { Prefs } from "@/lib/validation";

type BoolPref = "auto_speak" | "hide_images" | "hide_pinyin_front" | "tone_colors" | "ai_auto_suggest";

const ROWS: { key: BoolPref; label: string; hint: string }[] = [
  { key: "auto_speak", label: "Tự đọc từ khi lật thẻ", hint: "Phát âm ngay khi xem mặt sau." },
  {
    key: "hide_images",
    label: "Ẩn ảnh ở mặt trước thẻ",
    hint: "Tránh nhớ ảnh mà không nhớ từ.",
  },
  {
    key: "hide_pinyin_front",
    label: "Ẩn pinyin ở mặt trước (tiếng Trung)",
    hint: "Luyện đọc chữ Hán.",
  },
  { key: "tone_colors", label: "Tô màu thanh điệu pinyin", hint: "Dấu thanh vẫn luôn hiển thị." },
  {
    key: "ai_auto_suggest",
    label: "Tự gợi ý khi ngừng gõ",
    hint: "Tốn lượt gợi ý AI hơn. Mặc định tắt.",
  },
];

export function SwitchRow({
  id,
  label,
  hint,
  checked,
  onCheckedChange,
}: {
  id: string;
  label: string;
  hint?: string;
  checked: boolean;
  onCheckedChange: (v: boolean) => void;
}) {
  return (
    <div className="flex min-h-14 items-center justify-between gap-4 py-2">
      <label htmlFor={id} className="cursor-pointer">
        <span className="block text-[0.9375rem] text-ink">{label}</span>
        {hint && <span className="block text-sm text-ink-soft">{hint}</span>}
      </label>
      <Switch id={id} checked={checked} onCheckedChange={onCheckedChange} />
    </div>
  );
}

export function StudyPrefs({ prefs }: { prefs: Required<Prefs> }) {
  const [optimistic, setOptimistic] = useOptimistic(prefs);
  const [, startTransition] = useTransition();

  function toggle(key: BoolPref, value: boolean) {
    startTransition(async () => {
      setOptimistic({ ...optimistic, [key]: value });
      const res = await updatePrefs({ [key]: value });
      if (!res.ok) toast.error(res.error);
    });
  }

  return (
    <div className="ruled-list">
      {ROWS.map((r) => (
        <SwitchRow
          key={r.key}
          id={`pref-${r.key}`}
          label={r.label}
          hint={r.hint}
          checked={optimistic[r.key]}
          onCheckedChange={(v) => toggle(r.key, v)}
        />
      ))}
    </div>
  );
}
