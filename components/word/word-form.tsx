"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { AlertCircle, AlertTriangle, Loader2, Wand2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import { useForm, useWatch, type FieldErrors } from "react-hook-form";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { findDuplicates, updateWord, type DuplicateHit } from "@/lib/actions/words";
import type { ImageSuggestion } from "@/lib/ai/to-word";
import { LANGUAGES } from "@/lib/lang/registry";
import type { LangCode } from "@/lib/lang/types";
import { cn } from "@/lib/utils";
import { cleanWordInput } from "@/lib/word-clean";
import { emptyWord, wordInputSchema, type WordData, type WordInput } from "@/lib/word-schema";
import type { DetailTab } from "@/lib/word-summary";
import { AiSuggestButton, AiSuggestPanel, useAiSuggest, type AiFillResult } from "./ai-suggest";
import { PronounceButton } from "./pronounce-button";
import { Field, WordDetails } from "./word-details";
import { WordHero } from "./word-hero";

function tabForError(errors: FieldErrors<WordInput>): DetailTab | null {
  if (errors.examples) return "examples";
  if (errors.image_url || errors.image_source) return "image";
  if (
    errors.parts_of_speech ||
    errors.topic ||
    errors.emoji ||
    errors.collocations ||
    errors.synonyms ||
    errors.antonyms ||
    errors.word_family ||
    errors.meaning_en ||
    errors.lang_extra
  )
    return "info";
  if (errors.personal_note) return "note";
  return null;
}

export function WordForm({
  language,
  userId,
  wordId,
  initial,
  aiEnabled,
}: {
  deckId?: string;
  language: LangCode;
  userId: string;
  wordId: string;
  initial?: WordInput;
  aiEnabled: boolean;
}) {
  const router = useRouter();
  const def = LANGUAGES[language];
  const defaults = initial ?? emptyWord();
  const form = useForm<WordInput, unknown, WordData>({
    resolver: zodResolver(wordInputSchema),
    defaultValues: defaults,
  });
  const { register, handleSubmit, setValue, getValues, setError, formState, control } = form;
  const errors = formState.errors;

  const [pending, startTransition] = useTransition();
  const [duplicates, setDuplicates] = useState<DuplicateHit[]>([]);
  const [imageSuggestions, setImageSuggestions] = useState<ImageSuggestion[]>([]);
  const [detailTab, setDetailTab] = useState<DetailTab>("examples");
  const aiMeaning = useRef<string>(initial?.meaning_vi ?? "");
  const termRef = useRef<HTMLInputElement | null>(null);

  const term = useWatch({ control, name: "term" }) ?? "";
  const reading = useWatch({ control, name: "reading" }) ?? "";

  // Check duplicates
  useEffect(() => {
    const t = term.trim();
    if (!t) return;
    const timer = setTimeout(async () => {
      const hits = await findDuplicates(t, language);
      setDuplicates(hits.filter((h) => h.wordId !== wordId));
    }, 450);
    return () => clearTimeout(timer);
  }, [term, language, wordId]);

  async function fillPinyin() {
    const t = getValues("term").trim();
    if (!t) return;
    const { pinyin } = await import("pinyin-pro");
    setValue("reading", pinyin(t, { toneSandhi: false }).replace(/\s+/g, ""), { shouldDirty: true });
  }

  const applyAi = useCallback((result: AiFillResult) => {
    const typed = getValues("meaning_vi")?.trim();
    const keepMeaning = Boolean(typed) && typed !== aiMeaning.current;
    for (const [k, v] of Object.entries(result.values) as [keyof WordInput, unknown][]) {
      if (k === "meaning_vi" && keepMeaning) continue;
      if (v === undefined) continue;
      setValue(k, v as never, { shouldDirty: true });
      if (k === "meaning_vi") aiMeaning.current = String(v ?? "").trim();
    }
    setValue("ai_generated", true);
    setImageSuggestions(result.images);
  }, [getValues, setValue]);

  const ai = useAiSuggest({
    language,
    getTerm: () => getValues("term"),
    onApply: applyAi,
    term,
    autoEnabled: false,
    aiAvailable: aiEnabled,
  });

  const onSubmit = handleSubmit(
    (values) =>
      startTransition(async () => {
        const payload = cleanWordInput(values as WordInput);
        const res = await updateWord(wordId, payload);
        if (!res.ok) {
          Object.entries(res.fieldErrors ?? {}).forEach(([k, m]) => setError(k as keyof WordInput, { message: m }));
          toast.error(res.error);
          return;
        }
        toast.success("Đã lưu từ");
        router.push(`/words/${wordId}`);
        router.refresh();
      }),
    (errs) => {
      const target = tabForError(errs);
      if (target) setDetailTab(target);
      toast.error("Kiểm tra lại các trường được đánh dấu.");
    },
  );

  const termReg = register("term");

  return (
    <form onSubmit={(e) => void onSubmit(e)} className="space-y-5" noValidate>
      <div className="space-y-3">
        <div className="flex gap-2">
          <Input
            id="term"
            {...termReg}
            onChange={(e) => {
              termReg.onChange(e);
              if (duplicates.length) setDuplicates([]);
            }}
            ref={(el) => {
              termReg.ref(el);
              termRef.current = el;
            }}
            autoFocus
            autoComplete="off"
            autoCapitalize="none"
            spellCheck={false}
            lang={language === "zh" ? "zh-CN" : "en"}
            placeholder={def.termPlaceholder}
            className={cn("h-14 flex-1 px-4 text-2xl font-medium md:text-2xl", language === "zh" ? "font-hanzi" : "font-display")}
            aria-invalid={Boolean(errors.term) || undefined}
          />
          <AiSuggestButton loading={ai.state.status === "loading"} onClick={() => void ai.suggest()} />
        </div>
        {errors.term?.message && (
          <p className="flex items-center gap-1.5 text-sm text-danger-fg">
            <AlertCircle className="size-3.5 shrink-0" aria-hidden />
            {errors.term.message}
          </p>
        )}

        <AiSuggestPanel ai={ai} onUseSpelling={(t) => setValue("term", t, { shouldDirty: true })} />

        {term.trim() && duplicates.length > 0 && (
          <p role="status" className="flex items-start gap-2 rounded-md bg-streak-soft px-3 py-2 text-sm text-fg">
            <AlertTriangle className="mt-0.5 size-4 shrink-0 text-streak-fg" aria-hidden />
            <span>
              Từ này đã có trong bộ{" "}
              {duplicates.map((d, i) => (
                <span key={d.wordId}>
                  {i > 0 && ", "}
                  <Link href={`/words/${d.wordId}`} className="font-medium underline underline-offset-2">
                    {d.deckName}
                  </Link>
                </span>
              ))}
            </span>
          </p>
        )}
      </div>

      {term.trim() && (
        <WordHero
          lang={language}
          term={term.trim()}
          reading={reading?.trim() || null}
          size="sm"
          toneColors
          actions={<PronounceButton text={term} lang={language} />}
        />
      )}

      <div className="rounded-lg border border-border/60 bg-surface shadow-sm space-y-4 p-4">
        <Field label={def.readingLabel} htmlFor="reading">
          <div className="flex gap-2">
            <Input
              id="reading"
              {...register("reading")}
              placeholder={def.readingPlaceholder}
              className={cn("h-11", language === "en" ? "font-ipa" : "font-hanzi")}
              aria-invalid={Boolean(errors.reading) || undefined}
            />
            {language === "zh" && (
              <Button type="button" variant="outline" size="sm" onClick={fillPinyin} className="h-11 shrink-0" title="Điền pinyin tự động từ chữ Hán">
                <Wand2 className="size-4" aria-hidden />
                Điền pinyin
              </Button>
            )}
          </div>
        </Field>

        <Field label="Nghĩa tiếng Việt" htmlFor="meaning_vi" error={errors.meaning_vi?.message}>
          <Textarea
            id="meaning_vi"
            {...register("meaning_vi")}
            rows={2}
            placeholder="Ví dụ: kiên cường, mau phục hồi"
            className="text-base"
            aria-invalid={Boolean(errors.meaning_vi) || undefined}
          />
        </Field>
      </div>

      {/* Word Details in 4 tabs */}
      <Card className="p-4 sm:p-5">
        <WordDetails
          form={form}
          language={language}
          userId={userId}
          images={imageSuggestions}
          tab={detailTab}
          onTabChange={setDetailTab}
        />
      </Card>

      <div className="sticky bottom-[calc(4.5rem+env(safe-area-inset-bottom))] z-20 -mx-4 border-t border-border bg-surface px-4 py-3 lg:static lg:mx-0 lg:border-0 lg:bg-transparent lg:p-0">
        <Button type="submit" size="lg" disabled={pending} className="w-full sm:w-auto sm:px-10">
          {pending && <Loader2 className="animate-spin" aria-hidden />}
          Lưu từ
        </Button>
      </div>
    </form>
  );
}
