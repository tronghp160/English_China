"use client";

import { Globe2, Loader2, Lock, Users } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { LangFlag } from "@/components/lang-flag";
import { SwitchRow } from "@/components/settings/study-prefs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { createDeck, updateDeck } from "@/lib/actions/decks";
import { LANGUAGES } from "@/lib/lang/registry";
import { cn } from "@/lib/utils";
import type { DeckInput } from "@/lib/word-schema";

const VISIBILITY = [
  { value: "private", label: "Riêng tư", hint: "Chỉ mình bạn (có thể bật link chia sẻ sau)", icon: Lock },
  { value: "group", label: "Nhóm", hint: "Thành viên nhóm cùng học", icon: Users },
  { value: "public", label: "Công khai", hint: "Ai cũng tìm thấy ở mục Khám phá", icon: Globe2 },
] as const;

export function DeckForm({
  mode,
  deckId,
  initial,
  groups,
}: {
  mode: "create" | "edit";
  deckId?: string;
  initial?: Partial<DeckInput>;
  groups: { id: string; name: string }[];
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [v, setV] = useState<DeckInput>({
    name: initial?.name ?? "",
    description: initial?.description ?? "",
    language: initial?.language ?? "en",
    visibility: initial?.visibility ?? "private",
    group_id: initial?.group_id ?? groups[0]?.id ?? null,
    allow_member_edit: initial?.allow_member_edit ?? false,
    enable_recall: initial?.enable_recall ?? true,
  });
  const set = <K extends keyof DeckInput>(k: K, value: DeckInput[K]) => setV((s) => ({ ...s, [k]: value }));

  function submit(e: React.FormEvent) {
    e.preventDefault();
    startTransition(async () => {
      const res = mode === "create" ? await createDeck(v) : await updateDeck(deckId!, v);
      if (!res.ok) {
        setErrors(res.fieldErrors ?? {});
        toast.error(res.error);
        return;
      }
      if (mode === "create" && res.data && "id" in res.data) {
        toast.success("Đã tạo bộ từ");
        router.replace(`/decks/${res.data.id}`);
      } else {
        toast.success("Đã lưu bộ từ");
        router.push(`/decks/${deckId}`);
      }
      router.refresh();
    });
  }

  return (
    <form onSubmit={submit} className="space-y-6" noValidate>
      <div className="space-y-1.5">
        <Label htmlFor="deck-name">Tên bộ từ</Label>
        <Input
          id="deck-name"
          value={v.name}
          onChange={(e) => set("name", e.target.value)}
          placeholder="Ví dụ: IELTS Speaking"
          className="h-12 rounded-btn text-base"
          aria-invalid={Boolean(errors.name) || undefined}
          autoFocus={mode === "create"}
        />
        {errors.name && <p className="text-sm text-danger">{errors.name}</p>}
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="deck-desc">Mô tả (không bắt buộc)</Label>
        <Textarea
          id="deck-desc"
          value={v.description ?? ""}
          onChange={(e) => set("description", e.target.value)}
          rows={2}
          className="rounded-btn text-base"
        />
      </div>

      {mode === "create" && (
        <fieldset>
          <legend className="mb-2 text-sm font-medium">Ngôn ngữ</legend>
          <div role="radiogroup" className="grid grid-cols-2 gap-2">
            {(["en", "zh"] as const).map((code) => (
              <button
                key={code}
                type="button"
                role="radio"
                aria-checked={v.language === code}
                onClick={() => set("language", code)}
                className={cn(
                  "flex min-h-12 items-center justify-center gap-2 rounded-btn border text-base",
                  v.language === code ? "border-ink-blue bg-wash-blue font-medium" : "border-rule",
                )}
              >
                <LangFlag lang={code} /> {LANGUAGES[code].label}
              </button>
            ))}
          </div>
        </fieldset>
      )}

      <fieldset>
        <legend className="mb-2 text-sm font-medium">Ai được xem</legend>
        <div role="radiogroup" className="grid gap-2">
          {VISIBILITY.map(({ value, label, hint, icon: Icon }) => {
            const disabled = value === "group" && !groups.length;
            return (
              <button
                key={value}
                type="button"
                role="radio"
                aria-checked={v.visibility === value}
                disabled={disabled}
                onClick={() => set("visibility", value)}
                className={cn(
                  "flex min-h-14 items-center gap-3 rounded-btn border px-4 text-left disabled:opacity-50",
                  v.visibility === value ? "border-ink-blue bg-wash-blue" : "border-rule",
                )}
              >
                <Icon className="size-5 shrink-0 text-ink-soft" aria-hidden />
                <span>
                  <span className="block font-medium text-ink">{label}</span>
                  <span className="block text-sm text-ink-soft">
                    {disabled ? "Bạn chưa tham gia nhóm nào" : hint}
                  </span>
                </span>
              </button>
            );
          })}
        </div>
      </fieldset>

      {v.visibility === "group" && groups.length > 0 && (
        <div className="space-y-3 rounded-card border border-rule p-4">
          <div className="space-y-1.5">
            <Label htmlFor="deck-group">Nhóm</Label>
            <select
              id="deck-group"
              value={v.group_id ?? ""}
              onChange={(e) => set("group_id", e.target.value)}
              className="h-11 w-full rounded-btn border border-rule bg-surface px-3 text-base"
            >
              {groups.map((g) => (
                <option key={g.id} value={g.id}>
                  {g.name}
                </option>
              ))}
            </select>
            {errors.group_id && <p className="text-sm text-danger">{errors.group_id}</p>}
          </div>
          <SwitchRow
            id="allow-member-edit"
            label="Thành viên được thêm/sửa từ"
            checked={Boolean(v.allow_member_edit)}
            onCheckedChange={(c) => set("allow_member_edit", c)}
          />
        </div>
      )}

      <SwitchRow
        id="enable-recall"
        label="Luyện cả chiều nghĩa → từ"
        hint="Mở sau khi bạn đã nhớ chiều từ → nghĩa."
        checked={Boolean(v.enable_recall)}
        onCheckedChange={(c) => set("enable_recall", c)}
      />

      <Button type="submit" disabled={pending} className="h-12 w-full gap-2 rounded-btn text-base sm:w-auto sm:px-8">
        {pending && <Loader2 className="size-5 animate-spin" aria-hidden />}
        {mode === "create" ? "Tạo bộ từ" : "Lưu bộ từ"}
      </Button>
    </form>
  );
}
