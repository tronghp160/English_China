"use client";

import {
  AlertCircle,
  AlertTriangle,
  Check,
  ImageIcon,
  Lightbulb,
  Loader2,
  SlidersHorizontal,
  Trash2,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useRef } from "react";
import { useWatch, type UseFormReturn } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { findDuplicates, type DuplicateHit } from "@/lib/actions/words";
import type { ImageSuggestion } from "@/lib/ai/to-word";
import { LANGUAGES } from "@/lib/lang/registry";
import type { LangCode } from "@/lib/lang/types";
import { cn } from "@/lib/utils";
import type { WordInput } from "@/lib/word-schema";
import { detailSummary, type DetailTab } from "@/lib/word-summary";
import { useAiSuggest, type AiFillResult } from "./ai-suggest";
import { SenseChips } from "./sense-chips";

export type CardMeta = {
  images: ImageSuggestion[];
  source: "ai" | "dict" | null;
  aiMeaning: string | null;
  meaningTouched: boolean;
  readingTyped: boolean;
  duplicates: DuplicateHit[];
  batch: boolean;
  saveError: string | null;
};

export type ComposeCardProps = {
  index: number;
  form: UseFormReturn<{ cards: WordInput[] }>;
  meta: CardMeta;
  onMeta: (patch: Partial<CardMeta>) => void;
  language: LangCode;
  aiAvailable: boolean;
  canDelete: boolean;
  onDelete: (index: number) => void;
  onOpenDetail: (index: number, tab: DetailTab) => void;
  innerDuplicateIndex?: number;
  onCardPaste: (index: number, text: string) => void;
  isLastCard: boolean;
  onEnterAtEnd: () => void;
  disabled?: boolean;
};

export function ComposeCard({
  index,
  form,
  meta,
  onMeta,
  language,
  aiAvailable,
  canDelete,
  onDelete,
  onOpenDetail,
  innerDuplicateIndex,
  onCardPaste,
  isLastCard,
  onEnterAtEnd,
  disabled,
}: ComposeCardProps) {
  const indexRef = useRef(index);
  const metaRef = useRef(meta);
  useEffect(() => {
    indexRef.current = index;
    metaRef.current = meta;
  });

  const def = LANGUAGES[language];
  const { register, setValue, getValues, control } = form;

  const cardTerm = useWatch({ control, name: `cards.${index}.term` }) ?? "";
  const cardMeaning = useWatch({ control, name: `cards.${index}.meaning_vi` }) ?? "";
  const cardReading = useWatch({ control, name: `cards.${index}.reading` }) ?? "";
  const cardImageUrl = useWatch({ control, name: `cards.${index}.image_url` }) ?? "";

  const applyAi = useCallback(
    (r: AiFillResult) => {
      const base = `cards.${indexRef.current}` as const;
      const typed = (getValues(`${base}.meaning_vi`) ?? "").trim();
      const keepMeaning = Boolean(typed) && typed !== metaRef.current.aiMeaning;

      for (const [k, v] of Object.entries(r.values)) {
        if (v === undefined) continue;
        if (k === "meaning_vi" && keepMeaning) continue;
        if (k === "reading" && metaRef.current.readingTyped) continue;
        setValue(`${base}.${k as keyof WordInput}` as never, v as never, { shouldDirty: true });
      }
      setValue(`${base}.ai_generated` as never, true as never);
      onMeta({
        images: r.images,
        source: "ai",
        aiMeaning: keepMeaning ? metaRef.current.aiMeaning : String(r.values.meaning_vi ?? "").trim(),
      });
    },
    [getValues, setValue, onMeta],
  );

  const ai = useAiSuggest({
    language,
    getTerm: () => form.getValues(`cards.${indexRef.current}.term`),
    term: cardTerm,
    onApply: applyAi,
    autoEnabled: !meta.batch,
    aiAvailable,
  });

  async function fillPinyin() {
    const t = getValues(`cards.${indexRef.current}.term`)?.trim();
    if (!t) return;
    try {
      const { pinyin } = await import("pinyin-pro");
      const generated = pinyin(t, { toneSandhi: false }).replace(/\s+/g, "");
      setValue(`cards.${indexRef.current}.reading`, generated, { shouldDirty: true });
    } catch {}
  }

  // Duplicate check in user's decks
  const lastCheckedTerm = useRef("");
  const handleCheckDuplicates = useCallback(async (termToCheck: string) => {
    const t = termToCheck.trim();
    if (!t || t === lastCheckedTerm.current) return;
    lastCheckedTerm.current = t;
    const hits = await findDuplicates(t, language);
    onMeta({ duplicates: hits });
  }, [language, onMeta]);

  const isValid =
    Boolean(cardTerm.trim()) &&
    Boolean(cardMeaning.trim()) &&
    !meta.saveError &&
    innerDuplicateIndex === undefined;

  const showMeaningError =
    (meta.meaningTouched || meta.saveError !== null) &&
    !cardMeaning.trim() &&
    Boolean(cardTerm.trim());

  const termAriaLabel = index === 0 ? "Từ" : `Từ ${index + 1}`;
  const meaningAriaLabel = index === 0 ? "Nghĩa tiếng Việt" : `Nghĩa tiếng Việt ${index + 1}`;
  const readingAriaLabel =
    index === 0 ? def.readingLabel : `${def.readingLabel} ${index + 1}`;

  const summary = detailSummary(form.getValues(`cards.${index}`), meta.source);
  const aiSenses = ai.state.status === "done" ? ai.state.result.senses : [];
  const aiDidYouMean = ai.state.status === "done" ? ai.state.result.did_you_mean : null;

  return (
    <Card
      id={`card-${index}`}
      className={cn(
        "relative flex flex-col gap-3 p-4 transition-colors sm:p-5",
        isValid && "border-l-4 border-l-success",
        (meta.saveError || showMeaningError) && "border-danger",
      )}
    >
      {/* Top Header: Index + Validation Status + Actions */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <span className="text-sm font-bold text-fg-muted">{index + 1}</span>
          {isValid && <Check className="size-4 text-success-fg" strokeWidth={3} aria-hidden />}
        </div>

        <div className="flex items-center gap-1">
          {/* Image button */}
          <Button
            type="button"
            variant="ghost"
            size="icon"
            aria-label={`Ảnh cho thẻ ${index + 1}`}
            onClick={() => onOpenDetail(index, "image")}
            className="size-10 overflow-hidden rounded-md text-fg-muted hover:text-fg"
            disabled={disabled}
          >
            {cardImageUrl ? (
              <span className="relative size-8 overflow-hidden rounded">
                <Image src={cardImageUrl} alt="" fill sizes="32px" className="object-cover" />
              </span>
            ) : (
              <ImageIcon className="size-4" aria-hidden />
            )}
          </Button>

          {/* Details button */}
          <Button
            type="button"
            variant="ghost"
            aria-label={`Chi tiết thẻ ${index + 1}`}
            onClick={() => onOpenDetail(index, "examples")}
            className="h-10 gap-1.5 px-2.5 text-xs text-fg-muted hover:text-fg"
            disabled={disabled}
          >
            <SlidersHorizontal className="size-4 shrink-0" aria-hidden />
            <span className="hidden font-medium sm:inline">Chi tiết</span>
          </Button>

          {/* Delete button */}
          {canDelete && (
            <Button
              type="button"
              variant="ghost"
              size="icon"
              aria-label={`Xóa thẻ ${index + 1}`}
              onClick={() => onDelete(index)}
              className="size-10 text-fg-muted hover:text-danger-fg"
              disabled={disabled}
            >
              <Trash2 className="size-4" aria-hidden />
            </Button>
          )}
        </div>
      </div>

      {/* Inputs Grid: Term on left, Meaning on right */}
      <div className="grid gap-4 sm:grid-cols-2 sm:gap-6">
        {/* Term side */}
        <div className="flex flex-col gap-1.5">
          <div className="relative">
            <Input
              {...register(`cards.${index}.term`)}
              id={`card-${index}-term`}
              aria-label={termAriaLabel}
              autoComplete="off"
              autoCapitalize="none"
              spellCheck={false}
              lang={language === "zh" ? "zh-CN" : "en"}
              placeholder={def.termPlaceholder}
              disabled={disabled}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  form.setFocus(`cards.${index}.meaning_vi`);
                }
              }}
              onPaste={(e) => {
                const text =
                  e.clipboardData.getData("text/plain") ||
                  e.clipboardData.getData("text") ||
                  "";
                if (text.includes("\n")) {
                  e.preventDefault();
                  onCardPaste(index, text);
                }
              }}
              onBlur={() => {
                void handleCheckDuplicates(cardTerm);
                if (language === "zh" && !meta.readingTyped && !cardReading.trim()) {
                  void fillPinyin();
                }
              }}
              className={cn(
                "h-12 rounded-none border-0 border-b-2 border-border bg-transparent px-0 text-xl font-medium focus-visible:border-primary focus-visible:ring-0",
                language === "zh" ? "font-hanzi text-2xl" : "font-display text-2xl",
              )}
            />
            {ai.state.status === "loading" && (
              <Loader2 className="absolute top-3 right-0 size-5 animate-spin text-fg-muted" aria-hidden />
            )}
          </div>

          {/* Sub-line for Term: Reading input + Suggest button */}
          <div className="flex items-center justify-between gap-2 pt-1 text-xs">
            <div className="flex min-w-0 flex-1 items-center gap-1.5">
              <span className="shrink-0 font-semibold text-fg-muted">Từ</span>
              <span className="text-fg-subtle">·</span>
              <input
                {...register(`cards.${index}.reading`)}
                aria-label={readingAriaLabel}
                placeholder={def.readingPlaceholder}
                disabled={disabled}
                onChange={(e) => {
                  register(`cards.${index}.reading`).onChange(e);
                  onMeta({ readingTyped: true });
                }}
                className={cn(
                  "h-7 min-w-0 flex-1 border-0 border-b border-transparent bg-transparent px-1 text-xs outline-none focus:border-border-strong",
                  language === "en" ? "font-ipa" : "font-hanzi",
                )}
              />
            </div>

            <Button
              type="button"
              variant="soft"
              tone="blue"
              size="sm"
              disabled={disabled || ai.state.status === "loading"}
              onClick={() => void ai.suggest()}
              aria-label={`Gợi ý cho thẻ ${index + 1}`}
              className="h-8 shrink-0 px-2.5 text-xs font-semibold"
            >
              {ai.state.status === "loading" ? (
                <Loader2 className="size-3.5 animate-spin" aria-hidden />
              ) : (
                <Lightbulb className="size-3.5" aria-hidden />
              )}
              <span className="hidden sm:inline">Gợi ý</span>
            </Button>
          </div>

          {/* Sense Chips (if AI/dict returns > 1 sense) */}
          {aiSenses.length > 1 && (
            <div className="pt-2">
              <SenseChips
                senses={aiSenses}
                chosen={ai.state.status === "done" ? ai.state.chosen : []}
                onToggle={(i) => ai.toggle(i)}
                onChooseAll={() => ai.chooseAll()}
              />
            </div>
          )}

          {/* Spelling correction if present */}
          {aiDidYouMean && (
            <p className="flex items-center gap-1.5 pt-1 text-xs text-fg-muted">
              <span>Có phải bạn muốn gõ <strong className="text-fg">{aiDidYouMean}</strong>?</span>
              <button
                type="button"
                onClick={() => setValue(`cards.${index}.term`, aiDidYouMean, { shouldDirty: true })}
                className="font-semibold text-primary underline"
              >
                Áp dụng
              </button>
            </p>
          )}

          {/* Duplicate warnings */}
          {innerDuplicateIndex !== undefined && (
            <p className="flex items-center gap-1.5 pt-1 text-xs text-streak-fg">
              <AlertTriangle className="size-3.5 shrink-0" aria-hidden />
              <span>Trùng với thẻ số {innerDuplicateIndex + 1}</span>
            </p>
          )}

          {meta.duplicates.length > 0 && (
            <p className="flex items-center gap-1.5 pt-1 text-xs text-streak-fg">
              <AlertTriangle className="size-3.5 shrink-0" aria-hidden />
              <span>
                Đã có trong bộ{" "}
                {meta.duplicates.map((d, i) => (
                  <span key={d.wordId}>
                    {i > 0 && ", "}
                    <Link href={`/words/${d.wordId}`} className="font-semibold underline">
                      {d.deckName}
                    </Link>
                  </span>
                ))}
              </span>
            </p>
          )}
        </div>

        {/* Meaning side */}
        <div className="flex flex-col gap-1.5">
          <Textarea
            {...register(`cards.${index}.meaning_vi`)}
            id={`card-${index}-meaning`}
            aria-label={meaningAriaLabel}
            rows={2}
            placeholder="Ví dụ: kiên cường, mau phục hồi"
            disabled={disabled}
            onBlur={() => onMeta({ meaningTouched: true })}
            onKeyDown={(e) => {
              if (e.key === "Enter" || (e.key === "Tab" && !e.shiftKey)) {
                if (isLastCard && cardTerm.trim()) {
                  e.preventDefault();
                  onEnterAtEnd();
                }
              }
            }}
            className="h-12 min-h-12 resize-none rounded-none border-0 border-b-2 border-border bg-transparent px-0 text-base focus-visible:border-primary focus-visible:ring-0"
          />

          <div className="flex items-center justify-between pt-1 text-xs font-semibold text-fg-muted">
            <span>Nghĩa</span>
          </div>

          {showMeaningError && (
            <p className="flex items-center gap-1 text-xs text-danger-fg">
              <AlertCircle className="size-3.5 shrink-0" aria-hidden />
              Nhập nghĩa tiếng Việt
            </p>
          )}

          {meta.saveError && (
            <p className="flex items-center gap-1 text-xs text-danger-fg">
              <AlertCircle className="size-3.5 shrink-0" aria-hidden />
              {meta.saveError}
            </p>
          )}
        </div>
      </div>

      {/* Summary line */}
      {summary && <p className="truncate pt-1 text-xs text-fg-muted">{summary}</p>}
    </Card>
  );
}
