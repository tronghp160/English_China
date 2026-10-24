"use client";

import { ArrowDown, ArrowUp, Plus, Trash2 } from "lucide-react";
import { useState } from "react";
import { useFieldArray, type Control, type UseFormRegister } from "react-hook-form";
import { Input } from "@/components/ui/input";
import type { LangCode } from "@/lib/lang/types";
import { POS, posFor } from "@/lib/pos";
import { cn } from "@/lib/utils";
import type { WordInput } from "@/lib/word-schema";

function RowControls({
  index,
  count,
  onMove,
  onRemove,
  noun,
}: {
  index: number;
  count: number;
  onMove: (from: number, to: number) => void;
  onRemove: (i: number) => void;
  noun: string;
}) {
  return (
    <div className="flex shrink-0 flex-col gap-1">
      <button
        type="button"
        aria-label={`Đưa ${noun} ${index + 1} lên`}
        disabled={index === 0}
        onClick={() => onMove(index, index - 1)}
        className="grid size-9 place-items-center rounded-md text-ink-soft transition-colors hover:bg-surface-sunk disabled:opacity-30"
      >
        <ArrowUp className="size-4" aria-hidden />
      </button>
      <button
        type="button"
        aria-label={`Đưa ${noun} ${index + 1} xuống`}
        disabled={index === count - 1}
        onClick={() => onMove(index, index + 1)}
        className="grid size-9 place-items-center rounded-md text-ink-soft transition-colors hover:bg-surface-sunk disabled:opacity-30"
      >
        <ArrowDown className="size-4" aria-hidden />
      </button>
      <button
        type="button"
        aria-label={`Xóa ${noun} ${index + 1}`}
        onClick={() => onRemove(index)}
        className="grid size-9 place-items-center rounded-md text-seal-text transition-colors hover:bg-tint-seal"
      >
        <Trash2 className="size-4" aria-hidden />
      </button>
    </div>
  );
}

function AddButton({ onClick, children }: { onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex min-h-11 items-center gap-1.5 rounded-btn px-2 text-sm font-medium text-ink-violet transition-colors hover:bg-tint-violet"
    >
      <Plus className="size-4" aria-hidden />
      {children}
    </button>
  );
}

const inputCls = "";

export function ExamplesEditor({
  control,
  register,
  language,
  max = 6,
}: {
  control: Control<WordInput>;
  register: UseFormRegister<WordInput>;
  language: LangCode;
  max?: number;
}) {
  const { fields, append, remove, move } = useFieldArray({ control, name: "examples" });
  return (
    <div className="space-y-3">
      {fields.map((f, i) => (
        <div key={f.id} className="flex gap-2 rounded-card border border-rule bg-surface p-3">
          <div className="min-w-0 flex-1 space-y-2">
            <Input
              aria-label={`Câu ví dụ ${i + 1}`}
              placeholder={language === "zh" ? "我们要坚强。" : "She is resilient after the loss."}
              className={cn(inputCls, language === "zh" && "font-hanzi-sans")}
              {...register(`examples.${i}.text`)}
            />
            {language === "zh" && (
              <Input
                aria-label={`Pinyin câu ${i + 1}`}
                placeholder="Wǒmen yào jiānqiáng."
                className={inputCls}
                {...register(`examples.${i}.reading`)}
              />
            )}
            <Input aria-label={`Dịch câu ${i + 1}`} placeholder="Dịch tiếng Việt" className={inputCls} {...register(`examples.${i}.vi`)} />
          </div>
          <RowControls index={i} count={fields.length} onMove={move} onRemove={remove} noun="câu" />
        </div>
      ))}
      {fields.length < max && (
        <AddButton onClick={() => append({ text: "", reading: "", vi: "" })}>Thêm câu ví dụ</AddButton>
      )}
    </div>
  );
}

export function CollocationsEditor({
  control,
  register,
  language,
}: {
  control: Control<WordInput>;
  register: UseFormRegister<WordInput>;
  language: LangCode;
}) {
  const { fields, append, remove, move } = useFieldArray({ control, name: "collocations" });
  return (
    <div className="space-y-3">
      {fields.map((f, i) => (
        <div key={f.id} className="flex gap-2 rounded-card border border-rule bg-surface p-3">
          <div className="grid min-w-0 flex-1 gap-2 sm:grid-cols-2">
            <Input aria-label={`Cụm từ ${i + 1}`} placeholder="Cụm từ" className={inputCls} {...register(`collocations.${i}.text`)} />
            {language === "zh" && (
              <Input aria-label={`Pinyin cụm từ ${i + 1}`} placeholder="Pinyin" className={inputCls} {...register(`collocations.${i}.reading`)} />
            )}
            <Input aria-label={`Nghĩa cụm từ ${i + 1}`} placeholder="Nghĩa" className={inputCls} {...register(`collocations.${i}.vi`)} />
          </div>
          <RowControls index={i} count={fields.length} onMove={move} onRemove={remove} noun="cụm từ" />
        </div>
      ))}
      {fields.length < 8 && (
        <AddButton onClick={() => append({ text: "", reading: "", vi: "" })}>Thêm cụm từ</AddButton>
      )}
    </div>
  );
}

export function FamilyEditor({
  control,
  register,
  language,
}: {
  control: Control<WordInput>;
  register: UseFormRegister<WordInput>;
  language: LangCode;
}) {
  const { fields, append, remove, move } = useFieldArray({ control, name: "word_family" });
  return (
    <div className="space-y-3">
      {fields.map((f, i) => (
        <div key={f.id} className="flex gap-2 rounded-card border border-rule bg-surface p-3">
          <div className="grid min-w-0 flex-1 gap-2 sm:grid-cols-3">
            <Input aria-label={`Từ cùng họ ${i + 1}`} placeholder="resilience" className={inputCls} {...register(`word_family.${i}.text`)} />
            <select
              aria-label={`Loại từ ${i + 1}`}
              className="h-11 rounded-btn border border-input bg-surface px-2 text-base outline-none focus-visible:border-ink-violet focus-visible:ring-3 focus-visible:ring-tint-violet"
              {...register(`word_family.${i}.pos`)}
            >
              <option value="">Loại từ</option>
              {posFor(language).map((p) => (
                <option key={p} value={p}>
                  {POS[p].label}
                </option>
              ))}
            </select>
            <Input aria-label={`Nghĩa ${i + 1}`} placeholder="Nghĩa" className={inputCls} {...register(`word_family.${i}.vi`)} />
          </div>
          <RowControls index={i} count={fields.length} onMove={move} onRemove={remove} noun="từ" />
        </div>
      ))}
      {fields.length < 8 && <AddButton onClick={() => append({ text: "", pos: null, vi: "" })}>Thêm từ cùng họ</AddButton>}
    </div>
  );
}

/** Comma/Enter separated tags (synonyms, antonyms). */
export function TagInput({
  id,
  value,
  onChange,
  placeholder,
  max = 10,
}: {
  id: string;
  value: string[];
  onChange: (v: string[]) => void;
  placeholder?: string;
  max?: number;
}) {
  const [draft, setDraft] = useState("");
  function commit(raw: string) {
    const parts = raw
      .split(/[,，、;]/)
      .map((s) => s.trim())
      .filter(Boolean);
    if (!parts.length) return;
    onChange([...new Set([...value, ...parts])].slice(0, max));
    setDraft("");
  }
  return (
    <div className="flex min-h-11 flex-wrap items-center gap-1.5 rounded-btn border border-input bg-surface px-2 py-1.5 focus-within:border-ink-violet focus-within:ring-3 focus-within:ring-tint-violet">
      {value.map((t) => (
        <span key={t} className="inline-flex items-center gap-1 rounded-chip bg-tint-violet py-1 pr-1 pl-3 text-sm text-ink">
          {t}
          <button
            type="button"
            aria-label={`Bỏ ${t}`}
            onClick={() => onChange(value.filter((x) => x !== t))}
            className="grid size-6 place-items-center rounded-full text-ink-soft transition-colors hover:bg-surface"
          >
            ×
          </button>
        </span>
      ))}
      <input
        id={id}
        value={draft}
        onChange={(e) => {
          if (/[,，、;]$/.test(e.target.value)) commit(e.target.value);
          else setDraft(e.target.value);
        }}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            commit(draft);
          } else if (e.key === "Backspace" && !draft && value.length) {
            onChange(value.slice(0, -1));
          }
        }}
        onBlur={() => commit(draft)}
        placeholder={value.length ? "" : placeholder}
        className="min-w-24 flex-1 bg-transparent px-1 text-base outline-none placeholder:text-ink-faint"
      />
    </div>
  );
}
