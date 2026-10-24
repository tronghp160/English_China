"use client";

import { AlertCircle, Globe2, Loader2, Lock, Users } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { DeckCover } from "@/components/deck/deck-cover";
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

function FieldError({ children }: { children: React.ReactNode }) {
  return (
    <p className="flex items-center gap-1.5 text-sm text-seal-text">
      <AlertCircle className="size-3.5 shrink-0" aria-hidden />
      {children}
    </p>
  );
}

/** A choice drawn as a card: 1px outline, the chosen one gets a 2px violet outline and a pale violet fill. */
const CARD = "rounded-btn border text-left transition-colors disabled:opacity-50";
const CARD_ON = "border-ink-violet bg-tint-violet ring-1 ring-ink-violet";
const CARD_OFF = "border-input bg-surface hover:border-ink-soft/50";

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
    <div className="grid gap-6 md:grid-cols-[minmax(0,1fr)_8rem] md:gap-10">
      {/* The cover follows what is typed; on phones it sits above the fields */}
      <div className="md:order-last">
        <div className="md:sticky md:top-20">
          <DeckCover id={deckId ?? "new-deck"} language={v.language} name={v.name.trim() || "Tên bộ từ"} size="lg" />
        </div>
      </div>

      <form onSubmit={submit} className="min-w-0 space-y-6" noValidate>
        <div className="space-y-1.5">
          <Label htmlFor="deck-name">Tên bộ từ</Label>
          <Input
            id="deck-name"
            value={v.name}
            onChange={(e) => set("name", e.target.value)}
            placeholder="Ví dụ: IELTS Speaking"
            aria-invalid={Boolean(errors.name) || undefined}
            autoFocus={mode === "create"}
          />
          {errors.name && <FieldError>{errors.name}</FieldError>}
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="deck-desc">Mô tả (không bắt buộc)</Label>
          <Textarea id="deck-desc" value={v.description ?? ""} onChange={(e) => set("description", e.target.value)} rows={2} />
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
                  className={cn(CARD, "flex min-h-20 flex-col justify-center gap-1 px-4 py-3", v.language === code ? CARD_ON : CARD_OFF)}
                >
                  <span
                    aria-hidden
                    className={cn("text-xl leading-none text-ink", code === "zh" ? "font-hanzi" : "font-display font-medium")}
                  >
                    {code === "zh" ? "坚强" : "resilient"}
                  </span>
                  <span className="text-sm font-medium text-ink">{LANGUAGES[code].label}</span>
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
                  className={cn(CARD, "flex min-h-14 items-center gap-3 px-4", v.visibility === value ? CARD_ON : CARD_OFF)}
                >
                  <Icon className="size-5 shrink-0 text-ink-soft" strokeWidth={1.75} aria-hidden />
                  <span>
                    <span className="block font-medium text-ink">{label}</span>
                    <span className="block text-sm text-ink-soft">{disabled ? "Bạn chưa tham gia nhóm nào" : hint}</span>
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
                className="h-11 w-full rounded-btn border border-input bg-surface px-3 text-base outline-none focus-visible:border-ink-violet focus-visible:ring-3 focus-visible:ring-tint-violet"
              >
                {groups.map((g) => (
                  <option key={g.id} value={g.id}>
                    {g.name}
                  </option>
                ))}
              </select>
              {errors.group_id && <FieldError>{errors.group_id}</FieldError>}
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

        <Button type="submit" size="lg" disabled={pending} className="w-full sm:w-auto sm:px-8">
          {pending && <Loader2 className="animate-spin" aria-hidden />}
          {mode === "create" ? "Tạo bộ từ" : "Lưu bộ từ"}
        </Button>
      </form>
    </div>
  );
}
