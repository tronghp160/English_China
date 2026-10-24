"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { AlertCircle, AlertTriangle, Check, ChevronRight, Loader2, Wand2 } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import { Controller, useForm, useWatch, type FieldErrors } from "react-hook-form";
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
import { WordSpecimen } from "./word-specimen";
import type { ImageSuggestion } from "@/lib/ai/to-word";
import { AiSuggestButton, AiSuggestPanel, useAiSuggest, type AiFillResult } from "./ai-suggest";

type Mode = "create" | "edit";
type SectionId = "examples" | "image" | "tags" | "related" | "more" | "note";

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

/** Which collapsed section holds a field, so a validation error can open it. */
function sectionsWithErrors(errors: FieldErrors<WordInput>): SectionId[] {
  const out: SectionId[] = [];
  if (errors.examples) out.push("examples");
  if (errors.image_url || errors.image_source) out.push("image");
  if (errors.parts_of_speech || errors.topic || errors.emoji) out.push("tags");
  if (errors.collocations || errors.synonyms || errors.antonyms || errors.word_family) out.push("related");
  if (errors.meaning_en || errors.lang_extra) out.push("more");
  if (errors.personal_note) out.push("note");
  return out;
}

function Field({
  label,
  htmlFor,
  error,
  children,
  className,
}: {
  label: string;
  htmlFor?: string;
  error?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("space-y-1.5", className)}>
      <Label htmlFor={htmlFor}>{label}</Label>
      {children}
      {error && (
        <p className="flex items-center gap-1.5 text-sm text-seal-text">
          <AlertCircle className="size-3.5 shrink-0" aria-hidden />
          {error}
        </p>
      )}
    </div>
  );
}

/** One optional part of the word: a ruled row with a one-line summary; the arrow turns when it opens. */
function Section({
  id,
  title,
  summary,
  open,
  onToggle,
  children,
}: {
  id: SectionId;
  title: string;
  summary: React.ReactNode;
  open: boolean;
  onToggle: (id: SectionId) => void;
  children: React.ReactNode;
}) {
  const panelId = `section-${id}`;
  return (
    <div>
      <button
        type="button"
        onClick={() => onToggle(id)}
        aria-expanded={open}
        aria-controls={panelId}
        className="flex min-h-14 w-full items-center gap-3 px-4 py-2.5 text-left transition-colors hover:bg-surface-sunk"
      >
        <ChevronRight className={cn("size-4 shrink-0 text-ink-soft transition-transform duration-200", open && "rotate-90")} aria-hidden />
        <span className="shrink-0 font-medium text-ink">{title}</span>
        <span className="ml-auto min-w-0 truncate text-sm text-ink-soft">{summary}</span>
      </button>
      {open && (
        <div id={panelId} className="space-y-5 px-4 pt-1 pb-5">
          {children}
        </div>
      )}
    </div>
  );
}

const joinParts = (parts: (string | number | null | undefined | false)[]) => parts.filter(Boolean).join(", ");

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
  const [openSections, setOpenSections] = useState<Set<SectionId>>(new Set());
  const [duplicates, setDuplicates] = useState<DuplicateHit[]>([]);
  const [imageQuery, setImageQuery] = useState("");
  const [imageSearchKey, setImageSearchKey] = useState<number | undefined>(undefined);
  const [imageSuggestions, setImageSuggestions] = useState<ImageSuggestion[]>([]);
  const termRef = useRef<HTMLInputElement | null>(null);
  // Last meaning the AI wrote, so picking other senses can replace it but a typed one is kept.
  // A ref, not state: the suggestion hook keeps an older applyAi while its requests run.
  // No reset on save: the form clears meaning_vi then, so nothing is kept anyway.
  const aiMeaning = useRef<string | null>(null);

  const term = useWatch({ control, name: "term" }) ?? "";
  const reading = useWatch({ control, name: "reading" });
  const emoji = useWatch({ control, name: "emoji" });
  const imageUrl = useWatch({ control, name: "image_url" });
  const imageSource = useWatch({ control, name: "image_source" });
  const examples = useWatch({ control, name: "examples" }) ?? [];
  const pos = useWatch({ control, name: "parts_of_speech" }) ?? [];
  const topic = useWatch({ control, name: "topic" });
  const collocations = useWatch({ control, name: "collocations" }) ?? [];
  const synonyms = useWatch({ control, name: "synonyms" }) ?? [];
  const antonyms = useWatch({ control, name: "antonyms" }) ?? [];
  const family = useWatch({ control, name: "word_family" }) ?? [];
  const meaningEn = useWatch({ control, name: "meaning_en" });
  const extra = useWatch({ control, name: "lang_extra" }) ?? {};
  const note = useWatch({ control, name: "personal_note" });

  const toggleSection = (id: SectionId) =>
    setOpenSections((s) => {
      const next = new Set(s);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

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
    if (result.focusQuery) {
      setImageQuery(result.focusQuery);
      setImageSearchKey(Date.now());
    }
  }, [getValues, setValue]);

  const ai = useAiSuggest({
    language,
    getTerm: () => getValues("term"),
    onApply: applyAi,
    term,
    autoEnabled: mode === "create",
    aiAvailable: aiEnabled,
  });

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
          setDuplicates([]);
          setImageQuery("");
          setImageSearchKey(undefined);
          setImageSuggestions([]);
          setOpenSections(new Set());
          ai.reset();
          requestAnimationFrame(() => setFocus("term"));
        } else {
          toast.success("Đã lưu từ");
          router.push(`/words/${wordId}`);
          router.refresh();
        }
      }),
    (errs) => {
      const hidden = sectionsWithErrors(errs);
      if (hidden.length) setOpenSections((s) => new Set([...s, ...hidden]));
      toast.error("Kiểm tra lại các trường được đánh dấu.");
    },
  );

  const termReg = register("term");

  // One-line summaries for the collapsed sections.
  const exampleCount = examples.filter((e) => e.text?.trim()).length;
  const relatedCount = {
    collocations: collocations.filter((c) => c.text?.trim()).length,
    synonyms: synonyms.length,
    antonyms: antonyms.length,
    family: family.filter((w) => w.text?.trim()).length,
  };
  const hskLevel = extra.hsk?.level;
  const summaries: Record<SectionId, string> = {
    examples: exampleCount ? `${exampleCount} câu` : "Chưa có câu nào",
    image: imageUrl ? "Đã chọn ảnh" : "Chưa có ảnh",
    tags: joinParts([pos.map((p) => POS[p].label).join(", "), topic?.trim(), emoji]) || "Loại từ, chủ đề, emoji",
    related:
      joinParts([
        relatedCount.collocations > 0 && `${relatedCount.collocations} cụm từ`,
        relatedCount.synonyms > 0 && `${relatedCount.synonyms} đồng nghĩa`,
        relatedCount.antonyms > 0 && `${relatedCount.antonyms} trái nghĩa`,
        relatedCount.family > 0 && `${relatedCount.family} từ cùng họ`,
      ]) || (language === "en" ? "Cụm từ, đồng nghĩa, họ từ" : "Cụm từ, đồng nghĩa, trái nghĩa"),
    more:
      (language === "zh"
        ? joinParts([hskLevel && `HSK ${hskLevel}`, extra.han_viet?.trim() && `Hán Việt: ${extra.han_viet.trim()}`, extra.traditional?.trim() && `Phồn thể: ${extra.traditional.trim()}`])
        : joinParts([extra.cefr, extra.us_ipa?.trim(), meaningEn?.trim()])) ||
      (language === "zh" ? "Phồn thể, Hán Việt, HSK, lượng từ" : "CEFR, IPA, dạng từ, giải nghĩa tiếng Anh"),
    note: note?.trim() || "Mẹo nhớ chỉ mình bạn thấy",
  };

  return (
    <form onSubmit={(e) => void onSubmit(e)} className="space-y-5" noValidate>
      <div className="space-y-3">
        <div className="flex gap-2">
          <Label htmlFor="term" className="sr-only">
            Từ
          </Label>
          <Input
            id="term"
            {...termReg}
            onBlur={(e) => {
              void termReg.onBlur(e);
              ai.suggestIfNew();
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
          <p className="flex items-center gap-1.5 text-sm text-seal-text">
            <AlertCircle className="size-3.5 shrink-0" aria-hidden />
            {errors.term.message}
          </p>
        )}

        <AiSuggestPanel ai={ai} onUseSpelling={(t) => setValue("term", t, { shouldDirty: true })} />

        {term.trim() && duplicates.length > 0 && (
          <p role="status" className="flex items-start gap-2 rounded-btn bg-tint-turmeric px-3 py-2 text-sm text-ink">
            <AlertTriangle className="mt-0.5 size-4 shrink-0 text-turmeric-text" aria-hidden />
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
        <WordSpecimen
          lang={language}
          term={term.trim()}
          reading={reading?.trim() || null}
          size="sm"
          toneColors
          actions={<PronounceButton text={term} lang={language} />}
          className={language === "zh" ? "sheet p-4" : undefined}
        />
      )}

      <div className="sheet space-y-4 p-4">
        <Field label={def.readingLabel} htmlFor="reading">
          <div className="flex gap-2">
            <Input
              id="reading"
              {...register("reading")}
              placeholder={def.readingPlaceholder}
              className={cn("flex-1", language === "en" && "font-ipa")}
            />
            {language === "zh" && (
              <Button
                type="button"
                variant="outline"
                onClick={fillPinyin}
                aria-label="Tự điền pinyin"
                title="Tự điền pinyin"
                className="shrink-0"
                size="icon"
              >
                <Wand2 aria-hidden />
              </Button>
            )}
          </div>
        </Field>

        <Field label="Nghĩa tiếng Việt" htmlFor="meaning_vi" error={errors.meaning_vi?.message}>
          <Input
            id="meaning_vi"
            {...register("meaning_vi")}
            placeholder="kiên cường, mau phục hồi"
            aria-invalid={Boolean(errors.meaning_vi) || undefined}
          />
        </Field>
      </div>

      <section aria-labelledby="details-heading" className="space-y-2">
        <h2 id="details-heading" className="px-1 text-base">
          Thêm chi tiết <span className="font-sans text-sm font-normal text-ink-soft">(không bắt buộc)</span>
        </h2>
        <div className="sheet divide-y divide-rule overflow-hidden">
          <Section
            id="examples"
            title="Câu ví dụ"
            summary={summaries.examples}
            open={openSections.has("examples")}
            onToggle={toggleSection}
          >
            <ExamplesEditor control={control} register={register} language={language} />
          </Section>

          <Section
            id="image"
            title="Ảnh minh họa"
            summary={
              imageUrl ? (
                <span className="inline-flex items-center gap-2">
                  <span className="relative inline-block size-5 overflow-hidden rounded-sm align-middle">
                    <Image src={imageUrl} alt="" fill sizes="20px" className="object-cover" />
                  </span>
                  {summaries.image}
                </span>
              ) : (
                summaries.image
              )
            }
            open={openSections.has("image")}
            onToggle={toggleSection}
          >
            <ImagePicker
              value={{ image_url: imageUrl ?? null, image_source: imageSource ?? null }}
              onChange={(v) => {
                setValue("image_url", v.image_url, { shouldDirty: true });
                setValue("image_source", v.image_source, { shouldDirty: true });
              }}
              suggestedQuery={imageQuery || (language === "en" ? term : "")}
              suggestions={imageSuggestions}
              autoSearchKey={imageSearchKey}
              userId={userId}
              emoji={emoji}
            />
          </Section>

          <Section
            id="tags"
            title="Loại từ & chủ đề"
            summary={summaries.tags}
            open={openSections.has("tags")}
            onToggle={toggleSection}
          >
            <Controller
              control={control}
              name="parts_of_speech"
              render={({ field }) => (
                <fieldset>
                  <legend className="mb-2 text-sm font-medium">Loại từ</legend>
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
                            "inline-flex min-h-10 items-center gap-1.5 rounded-chip border px-3 text-sm transition-colors",
                            on ? "border-ink-violet bg-tint-violet font-medium text-ink" : "border-input text-ink-soft hover:text-ink",
                          )}
                        >
                          {on && <Check className="size-3.5 text-ink-violet" strokeWidth={2.5} aria-hidden />}
                          {POS[p].label}
                        </button>
                      );
                    })}
                  </div>
                </fieldset>
              )}
            />
            <div className="grid grid-cols-[1fr_6rem] gap-3">
              <Field label="Chủ đề" htmlFor="topic">
                <Input id="topic" list="topic-options" {...register("topic")} placeholder="Cảm xúc" />
                <datalist id="topic-options">
                  {STANDARD_TOPICS.map((t) => (
                    <option key={t} value={t} />
                  ))}
                </datalist>
              </Field>
              <Field label="Emoji" htmlFor="emoji">
                <Input id="emoji" {...register("emoji")} className="text-center text-xl" maxLength={8} />
              </Field>
            </div>
          </Section>

          <Section
            id="related"
            title="Từ liên quan"
            summary={summaries.related}
            open={openSections.has("related")}
            onToggle={toggleSection}
          >
            <Field label="Cụm từ thường gặp">
              <CollocationsEditor control={control} register={register} language={language} />
            </Field>
            <div className="grid gap-4 sm:grid-cols-2">
              <Controller
                control={control}
                name="synonyms"
                render={({ field }) => (
                  <Field label="Đồng nghĩa" htmlFor="synonyms">
                    <TagInput id="synonyms" value={field.value ?? []} onChange={field.onChange} placeholder="Gõ rồi nhấn Enter" />
                  </Field>
                )}
              />
              <Controller
                control={control}
                name="antonyms"
                render={({ field }) => (
                  <Field label="Trái nghĩa" htmlFor="antonyms">
                    <TagInput id="antonyms" value={field.value ?? []} onChange={field.onChange} placeholder="Gõ rồi nhấn Enter" />
                  </Field>
                )}
              />
            </div>
            {language === "en" && (
              <Field label="Họ từ">
                <FamilyEditor control={control} register={register} language={language} />
              </Field>
            )}
          </Section>

          <Section
            id="more"
            title="Thông tin thêm"
            summary={summaries.more}
            open={openSections.has("more")}
            onToggle={toggleSection}
          >
            <Field label="Giải nghĩa tiếng Anh" htmlFor="meaning_en">
              <Input id="meaning_en" {...register("meaning_en")} placeholder="Able to recover quickly from difficulties." />
            </Field>

            {language === "zh" ? (
              <div className="grid gap-4 sm:grid-cols-3">
                <Field label="Phồn thể" htmlFor="traditional">
                  <Input id="traditional" {...register("lang_extra.traditional")} placeholder="堅強" className="font-hanzi" />
                </Field>
                <Field label="Âm Hán Việt" htmlFor="han_viet">
                  <Input id="han_viet" {...register("lang_extra.han_viet")} placeholder="kiên cường" />
                </Field>
                <Field label="HSK" htmlFor="hsk">
                  <select id="hsk" {...register("lang_extra.hsk.level")} className="h-11 w-full rounded-btn border border-input bg-surface px-3 text-base outline-none focus-visible:border-ink-violet focus-visible:ring-3 focus-visible:ring-tint-violet">
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
                    <Field label="Lượng từ" htmlFor="measure" className="sm:col-span-3">
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
                <Field label="CEFR" htmlFor="cefr">
                  <select id="cefr" {...register("lang_extra.cefr")} className="h-11 w-full rounded-btn border border-input bg-surface px-3 text-base outline-none focus-visible:border-ink-violet focus-visible:ring-3 focus-visible:ring-tint-violet">
                    <option value="">Không rõ</option>
                    {def.levels.map((l) => (
                      <option key={l} value={l}>
                        {l}
                      </option>
                    ))}
                  </select>
                </Field>
                <Field label="IPA Mỹ" htmlFor="us_ipa">
                  <Input id="us_ipa" {...register("lang_extra.us_ipa")} className="font-ipa" />
                </Field>
                <Field label="IPA Anh" htmlFor="uk_ipa">
                  <Input id="uk_ipa" {...register("lang_extra.uk_ipa")} className="font-ipa" />
                </Field>
                <Field label="Số nhiều" htmlFor="plural">
                  <Input id="plural" {...register("lang_extra.plural")} />
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
                      <Input key={k} aria-label={l} placeholder={l} {...register(`lang_extra.verb_forms.${k}`)} />
                    ))}
                  </div>
                </fieldset>
              </div>
            )}
          </Section>

          <Section
            id="note"
            title="Ghi chú riêng"
            summary={summaries.note}
            open={openSections.has("note")}
            onToggle={toggleSection}
          >
            <Textarea
              id="personal_note"
              aria-label="Ghi chú riêng (mẹo nhớ)"
              {...register("personal_note")}
              rows={3}
              placeholder="Chỉ mình bạn thấy khi ôn."
              aria-invalid={Boolean(errors.personal_note) || undefined}
            />
            {errors.personal_note?.message && <p className="text-sm text-seal-text">{errors.personal_note.message}</p>}
          </Section>
        </div>
      </section>

      <div className="sticky bottom-[calc(4.5rem+env(safe-area-inset-bottom))] z-20 -mx-4 border-t border-rule bg-surface px-4 py-3 lg:static lg:mx-0 lg:border-0 lg:bg-transparent lg:p-0">
        <Button type="submit" size="lg" disabled={pending} className="w-full sm:w-auto sm:px-10">
          {pending && <Loader2 className="animate-spin" aria-hidden />}
          Lưu từ
        </Button>
        {mode === "create" && <span className="ml-3 hidden text-sm text-ink-soft sm:inline">vào bộ {deckName}</span>}
      </div>
    </form>
  );
}
