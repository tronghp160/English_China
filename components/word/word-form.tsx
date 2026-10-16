"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { AlertTriangle, ChevronDown, Loader2, Wand2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import { Controller, useForm, useWatch } from "react-hook-form";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { createWord, findDuplicates, updateWord, type DuplicateHit } from "@/lib/actions/words";
import { LANGUAGES } from "@/lib/lang/registry";
import type { LangCode } from "@/lib/lang/types";
import { POS, posFor } from "@/lib/pos";
import { STANDARD_TOPICS } from "@/lib/topics";
import { cn } from "@/lib/utils";
import { emptyWord, wordInputSchema, type WordData, type WordInput } from "@/lib/word-schema";
import { CollocationsEditor, ExamplesEditor, FamilyEditor, TagInput } from "./list-editors";
import { ImagePicker } from "./image-picker";
import { PronounceButton } from "./pronounce-button";
import { AiSuggestButton, AiSuggestPanel, useAiSuggest, type AiFillResult } from "./ai-suggest";

type Mode = "create" | "edit";

/** Drop empty rows/objects so optional sections don't fail validation. */
function clean(v: WordInput): WordInput {
  const extra = { ...(v.lang_extra ?? {}) } as Record<string, unknown>;
  const vf = extra.verb_forms as Record<string, string> | null | undefined;
  if (vf && !Object.values(vf).some((x) => x?.trim())) extra.verb_forms = null;
  else if (vf) {
    extra.verb_forms = Object.fromEntries(Object.entries(vf).map(([k, x]) => [k, x?.trim() || "—"]));
  }
  const hsk = extra.hsk as { level?: number | string; version?: string } | null | undefined;
  if (!hsk || !hsk.level) extra.hsk = null;
  else extra.hsk = { level: Number(hsk.level), version: hsk.version === "2.0" ? "2.0" : "3.0" };
  if (!extra.cefr) extra.cefr = null;
  return {
    ...v,
    examples: (v.examples ?? []).filter((e) => e.text?.trim()),
    collocations: (v.collocations ?? []).filter((c) => c.text?.trim()),
    word_family: (v.word_family ?? []).filter((w) => w.text?.trim()).map((w) => ({ ...w, pos: w.pos || null })),
    lang_extra: extra as WordInput["lang_extra"],
  };
}

function Field({
  label,
  htmlFor,
  error,
  hint,
  ai,
  children,
  className,
}: {
  label: string;
  htmlFor?: string;
  error?: string;
  hint?: React.ReactNode;
  ai?: boolean;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("space-y-1.5", className)}>
      <div className="flex items-center gap-2">
        <Label htmlFor={htmlFor}>{label}</Label>
        {ai && (
          <span className="rounded-full bg-wash-yellow px-2 py-0.5 text-xs font-medium text-tone-2">AI gợi ý</span>
        )}
      </div>
      <div className={cn(ai && "rounded-[12px] ring-2 ring-highlight/70 ring-offset-1 ring-offset-paper")}>{children}</div>
      {(error || hint) && <p className={cn("text-sm", error ? "text-danger" : "text-ink-soft")}>{error ?? hint}</p>}
    </div>
  );
}

export function WordForm({
  mode,
  deckId,
  deckName,
  language,
  userId,
  wordId,
  initial,
  aiEnabled,
}: {
  mode: Mode;
  deckId: string;
  deckName: string;
  language: LangCode;
  userId: string;
  wordId?: string;
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
  const { register, control, handleSubmit, reset, setValue, getValues, setError, formState, setFocus } = form;
  const errors = formState.errors;
  const [pending, startTransition] = useTransition();
  const [detailsOpen, setDetailsOpen] = useState(mode === "edit");
  const [duplicates, setDuplicates] = useState<DuplicateHit[]>([]);
  const [aiFields, setAiFields] = useState<Set<string>>(new Set());
  const [imageQuery, setImageQuery] = useState("");
  const [imageSearchKey, setImageSearchKey] = useState<number | undefined>(undefined);
  const termRef = useRef<HTMLInputElement | null>(null);

  const term = useWatch({ control, name: "term" }) ?? "";
  const emoji = useWatch({ control, name: "emoji" });
  const imageUrl = useWatch({ control, name: "image_url" });
  const imageSource = useWatch({ control, name: "image_source" });

  // Live duplicate warning (§11.4)
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
    const keepMeaning = getValues("meaning_vi")?.trim();
    const filled = new Set<string>();
    for (const [k, v] of Object.entries(result.values) as [keyof WordInput, unknown][]) {
      if (k === "meaning_vi" && keepMeaning) continue;
      if (v === undefined) continue;
      setValue(k, v as never, { shouldDirty: true });
      filled.add(k);
    }
    setAiFields(filled);
    setValue("ai_generated", true);
    setDetailsOpen(true);
    if (result.imageQuery) {
      setImageQuery(result.imageQuery);
      setImageSearchKey(Date.now());
    }
  }, [getValues, setValue]);

  const ai = useAiSuggest({ language, getTerm: () => getValues("term"), onApply: applyAi, term });

  const onSubmit = handleSubmit(
    (values) =>
      startTransition(async () => {
        const payload = clean(values as WordInput);
        const res = mode === "create" ? await createWord(deckId, payload) : await updateWord(wordId!, payload);
        if (!res.ok) {
          Object.entries(res.fieldErrors ?? {}).forEach(([k, m]) => setError(k as keyof WordInput, { message: m }));
          toast.error(res.error);
          return;
        }
        if (mode === "create") {
          const saved = res.data.term;
          toast.success(`Đã lưu ${saved}`, {
            action: { label: "Xem", onClick: () => router.push(`/words/${res.data.id}`) },
          });
          reset(emptyWord());
          setAiFields(new Set());
          setDuplicates([]);
          setImageQuery("");
          setImageSearchKey(undefined);
          setDetailsOpen(false);
          ai.reset();
          requestAnimationFrame(() => setFocus("term"));
        } else {
          toast.success("Đã lưu từ");
          router.push(`/words/${wordId}`);
          router.refresh();
        }
      }),
    () => toast.error("Kiểm tra lại các trường được đánh dấu."),
  );

  const termReg = register("term");

  return (
    <form onSubmit={(e) => void onSubmit(e)} className="space-y-6" noValidate>
      <Field label="Từ" htmlFor="term" error={errors.term?.message}>
        <div className="flex gap-2">
          <Input
            id="term"
            {...termReg}
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
            className={cn("h-14 flex-1 rounded-[10px] text-xl font-medium", language === "zh" && "font-hanzi-sans")}
            aria-invalid={Boolean(errors.term) || undefined}
          />
          {aiEnabled && <AiSuggestButton loading={ai.state.status === "loading"} onClick={() => void ai.suggest()} />}
        </div>
      </Field>

      {aiEnabled && <AiSuggestPanel ai={ai} onUseSpelling={(t) => setValue("term", t, { shouldDirty: true })} />}

      {term.trim() && duplicates.length > 0 && (
        <p role="status" className="-mt-3 flex items-start gap-2 rounded-[10px] bg-wash-yellow px-3 py-2 text-sm text-ink">
          <AlertTriangle className="mt-0.5 size-4 shrink-0 text-tone-2" aria-hidden />
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

      <Field
        label={def.readingLabel}
        htmlFor="reading"
        ai={aiFields.has("reading")}
        hint={language === "zh" ? "Pinyin có dấu, ví dụ jiānqiáng" : undefined}
      >
        <div className="flex gap-2">
          <Input
            id="reading"
            {...register("reading")}
            placeholder={def.readingPlaceholder}
            className={cn("h-11 flex-1 rounded-[10px] text-base", language === "en" && "font-ipa")}
          />
          {language === "zh" && (
            <Button type="button" variant="outline" onClick={fillPinyin} className="h-11 gap-1.5 rounded-[10px] px-3">
              <Wand2 className="size-4" aria-hidden />
              Tự điền
            </Button>
          )}
          {term.trim() && <PronounceButton text={term} lang={language} />}
        </div>
      </Field>

      <Field label="Nghĩa tiếng Việt" htmlFor="meaning_vi" error={errors.meaning_vi?.message} ai={aiFields.has("meaning_vi")}>
        <Input
          id="meaning_vi"
          {...register("meaning_vi")}
          placeholder="kiên cường, mau phục hồi"
          className="h-12 rounded-[10px] text-base"
          aria-invalid={Boolean(errors.meaning_vi) || undefined}
        />
      </Field>

      <Controller
        control={control}
        name="parts_of_speech"
        render={({ field }) => (
          <fieldset className={cn(aiFields.has("parts_of_speech") && "rounded-[12px] p-2 ring-2 ring-highlight/70")}>
            <legend className="mb-2 text-sm font-medium">
              Loại từ{" "}
              {aiFields.has("parts_of_speech") && (
                <span className="ml-1 rounded-full bg-wash-yellow px-2 py-0.5 text-xs font-medium text-tone-2">AI gợi ý</span>
              )}
            </legend>
            <div className="flex flex-wrap gap-2">
              {posFor(language).map((p) => {
                const on = (field.value ?? []).includes(p);
                return (
                  <button
                    key={p}
                    type="button"
                    aria-pressed={on}
                    onClick={() => field.onChange(on ? field.value!.filter((x) => x !== p) : [...(field.value ?? []), p])}
                    className={cn(
                      "min-h-10 rounded-full border px-3 text-sm",
                      on ? cn("border-transparent font-medium", POS[p].wash, POS[p].badge) : "border-rule text-ink-soft",
                    )}
                  >
                    {POS[p].label}
                  </button>
                );
              })}
            </div>
          </fieldset>
        )}
      />

      <div className="rounded-[12px] border border-rule bg-surface">
        <button
          type="button"
          onClick={() => setDetailsOpen((o) => !o)}
          aria-expanded={detailsOpen}
          className="flex min-h-14 w-full items-center justify-between px-4 text-left font-medium text-ink"
        >
          Thêm chi tiết
          <span className="flex items-center gap-2 text-sm font-normal text-ink-soft">
            Câu ví dụ, ảnh, cụm từ…
            <ChevronDown className={cn("size-5 transition-transform", detailsOpen && "rotate-180")} aria-hidden />
          </span>
        </button>

        {detailsOpen && (
          <div className="space-y-6 border-t border-rule px-4 py-5">
            <Field label="Câu ví dụ" ai={aiFields.has("examples")}>
              <ExamplesEditor control={control} register={register} language={language} />
            </Field>

            <Field label="Ảnh minh họa">
              <ImagePicker
                value={{ image_url: imageUrl ?? null, image_source: imageSource ?? null }}
                onChange={(v) => {
                  setValue("image_url", v.image_url, { shouldDirty: true });
                  setValue("image_source", v.image_source, { shouldDirty: true });
                }}
                suggestedQuery={imageQuery || (language === "en" ? term : "")}
                autoSearchKey={imageSearchKey}
                userId={userId}
                emoji={emoji}
              />
            </Field>

            <div className="grid gap-4 sm:grid-cols-[1fr_8rem]">
              <Field label="Chủ đề" htmlFor="topic" ai={aiFields.has("topic")}>
                <Input id="topic" list="topic-options" {...register("topic")} placeholder="Cảm xúc" className="h-11 rounded-[10px] text-base" />
                <datalist id="topic-options">
                  {STANDARD_TOPICS.map((t) => (
                    <option key={t} value={t} />
                  ))}
                </datalist>
              </Field>
              <Field label="Emoji" htmlFor="emoji" ai={aiFields.has("emoji")}>
                <Input id="emoji" {...register("emoji")} placeholder="🌱" className="h-11 rounded-[10px] text-center text-xl" maxLength={8} />
              </Field>
            </div>

            <Field label="Giải nghĩa tiếng Anh" htmlFor="meaning_en" ai={aiFields.has("meaning_en")}>
              <Input id="meaning_en" {...register("meaning_en")} placeholder="Able to recover quickly from difficulties." className="h-11 rounded-[10px] text-base" />
            </Field>

            {language === "zh" ? (
              <div className="grid gap-4 sm:grid-cols-3">
                <Field label="Phồn thể" htmlFor="traditional" ai={aiFields.has("lang_extra")}>
                  <Input id="traditional" {...register("lang_extra.traditional")} placeholder="堅強" className="h-11 rounded-[10px] font-hanzi-sans text-base" />
                </Field>
                <Field label="Âm Hán Việt" htmlFor="han_viet" ai={aiFields.has("lang_extra")}>
                  <Input id="han_viet" {...register("lang_extra.han_viet")} placeholder="kiên cường" className="h-11 rounded-[10px] text-base" />
                </Field>
                <Field label="HSK" htmlFor="hsk" ai={aiFields.has("lang_extra")}>
                  <select id="hsk" {...register("lang_extra.hsk.level")} className="h-11 w-full rounded-[10px] border border-rule bg-surface px-3 text-base">
                    <option value="">Không rõ</option>
                    {def.levels.map((l) => (
                      <option key={l} value={l}>
                        HSK {l}
                      </option>
                    ))}
                  </select>
                </Field>
                <Controller
                  control={control}
                  name="lang_extra.measure_words"
                  render={({ field }) => (
                    <Field label="Lượng từ" htmlFor="measure" hint="Ví dụ: 个 gè" className="sm:col-span-3">
                      <TagInput
                        id="measure"
                        max={3}
                        value={(field.value ?? []).map((m) => `${m.char} ${m.pinyin}`.trim())}
                        onChange={(tags) =>
                          field.onChange(
                            tags.map((t) => {
                              const [char = "", ...rest] = t.split(/\s+/);
                              return { char, pinyin: rest.join(" ") };
                            }),
                          )
                        }
                        placeholder="个 gè"
                      />
                    </Field>
                  )}
                />
              </div>
            ) : (
              <div className="grid gap-4 sm:grid-cols-3">
                <Field label="CEFR" htmlFor="cefr" ai={aiFields.has("lang_extra")}>
                  <select id="cefr" {...register("lang_extra.cefr")} className="h-11 w-full rounded-[10px] border border-rule bg-surface px-3 text-base">
                    <option value="">Không rõ</option>
                    {def.levels.map((l) => (
                      <option key={l} value={l}>
                        {l}
                      </option>
                    ))}
                  </select>
                </Field>
                <Field label="IPA Mỹ" htmlFor="us_ipa">
                  <Input id="us_ipa" {...register("lang_extra.us_ipa")} className="h-11 rounded-[10px] font-ipa text-base" />
                </Field>
                <Field label="IPA Anh" htmlFor="uk_ipa">
                  <Input id="uk_ipa" {...register("lang_extra.uk_ipa")} className="h-11 rounded-[10px] font-ipa text-base" />
                </Field>
                <Field label="Số nhiều" htmlFor="plural">
                  <Input id="plural" {...register("lang_extra.plural")} className="h-11 rounded-[10px] text-base" />
                </Field>
                <fieldset className="space-y-1.5 sm:col-span-3">
                  <legend className="text-sm font-medium">Dạng động từ</legend>
                  <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                    {(
                      [
                        ["past", "Quá khứ"],
                        ["past_participle", "Phân từ II"],
                        ["ing", "V-ing"],
                        ["third_person", "Ngôi 3 số ít"],
                      ] as const
                    ).map(([k, l]) => (
                      <Input key={k} aria-label={l} placeholder={l} {...register(`lang_extra.verb_forms.${k}`)} className="h-11 rounded-[10px] text-base" />
                    ))}
                  </div>
                </fieldset>
              </div>
            )}

            <Field label="Cụm từ thường gặp" ai={aiFields.has("collocations")}>
              <CollocationsEditor control={control} register={register} language={language} />
            </Field>

            <div className="grid gap-4 sm:grid-cols-2">
              <Controller
                control={control}
                name="synonyms"
                render={({ field }) => (
                  <Field label="Đồng nghĩa" htmlFor="synonyms" ai={aiFields.has("synonyms")}>
                    <TagInput id="synonyms" value={field.value ?? []} onChange={field.onChange} placeholder="Gõ rồi nhấn Enter" />
                  </Field>
                )}
              />
              <Controller
                control={control}
                name="antonyms"
                render={({ field }) => (
                  <Field label="Trái nghĩa" htmlFor="antonyms" ai={aiFields.has("antonyms")}>
                    <TagInput id="antonyms" value={field.value ?? []} onChange={field.onChange} placeholder="Gõ rồi nhấn Enter" />
                  </Field>
                )}
              />
            </div>

            {language === "en" && (
              <Field label="Họ từ" ai={aiFields.has("word_family")}>
                <FamilyEditor control={control} register={register} language={language} />
              </Field>
            )}

            <Field label="Ghi chú riêng (mẹo nhớ)" htmlFor="personal_note" ai={aiFields.has("personal_note")} error={errors.personal_note?.message}>
              <Textarea id="personal_note" {...register("personal_note")} rows={3} className="rounded-[10px] text-base" placeholder="Chỉ mình bạn thấy khi ôn." />
            </Field>
          </div>
        )}
      </div>

      <div className="sticky bottom-[calc(4.5rem+env(safe-area-inset-bottom))] z-20 -mx-4 border-t border-rule bg-paper/95 px-4 py-3 backdrop-blur lg:static lg:mx-0 lg:border-0 lg:bg-transparent lg:p-0">
        <Button type="submit" disabled={pending} className="h-12 w-full gap-2 rounded-[10px] text-base sm:w-auto sm:px-10">
          {pending && <Loader2 className="size-5 animate-spin" aria-hidden />}
          Lưu từ
        </Button>
        {mode === "create" && <span className="ml-3 hidden text-sm text-ink-soft sm:inline">vào bộ {deckName}</span>}
      </div>
    </form>
  );
}
