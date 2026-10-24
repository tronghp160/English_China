"use client";

import { AlertCircle, Check } from "lucide-react";
import { useState } from "react";
import { Controller, type UseFormReturn } from "react-hook-form";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import type { ImageSuggestion } from "@/lib/ai/to-word";
import { LANGUAGES } from "@/lib/lang/registry";
import type { LangCode } from "@/lib/lang/types";
import { POS, posFor } from "@/lib/pos";
import { STANDARD_TOPICS } from "@/lib/topics";
import { cn } from "@/lib/utils";
import type { WordData, WordInput } from "@/lib/word-schema";
import { tabLabel, type DetailTab } from "@/lib/word-summary";
import { ImagePicker } from "./image-picker";
import { CollocationsEditor, ExamplesEditor, FamilyEditor, TagInput } from "./list-editors";

export type WordDetailsProps = {
  form: UseFormReturn<WordInput, unknown, WordData>;
  language: LangCode;
  userId: string;
  images: ImageSuggestion[];
  tab?: DetailTab;
  onTabChange?: (t: DetailTab) => void;
  className?: string;
};

export function Field({
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
        <p className="flex items-center gap-1.5 text-sm text-danger-fg">
          <AlertCircle className="size-3.5 shrink-0" aria-hidden />
          {error}
        </p>
      )}
    </div>
  );
}

export function WordDetails({
  form,
  language,
  userId,
  images,
  tab,
  onTabChange,
  className,
}: WordDetailsProps) {
  const [internalTab, setInternalTab] = useState<DetailTab>("examples");
  const currentTab = tab ?? internalTab;

  function handleTabChange(t: string) {
    const nextTab = t as DetailTab;
    setInternalTab(nextTab);
    onTabChange?.(nextTab);
  }

  const {
    register,
    control,
    setValue,
    watch,
    formState: { errors },
  } = form;

  const def = LANGUAGES[language];
  const values = watch();
  const term = watch("term") ?? "";
  const imageUrl = watch("image_url");
  const imageSource = watch("image_source");
  const emoji = watch("emoji");

  return (
    <Tabs value={currentTab} onValueChange={handleTabChange} className={cn("w-full", className)}>
      <TabsList className="mb-4 flex w-full justify-start overflow-x-auto border-b border-border bg-transparent p-0">
        <TabsTrigger value="examples" className="min-h-10 px-4 py-2 text-sm font-semibold">
          {tabLabel("examples", values)}
        </TabsTrigger>
        <TabsTrigger value="image" className="min-h-10 px-4 py-2 text-sm font-semibold">
          {tabLabel("image", values)}
        </TabsTrigger>
        <TabsTrigger value="info" className="min-h-10 px-4 py-2 text-sm font-semibold">
          {tabLabel("info", values)}
        </TabsTrigger>
        <TabsTrigger value="note" className="min-h-10 px-4 py-2 text-sm font-semibold">
          {tabLabel("note", values)}
        </TabsTrigger>
      </TabsList>

      <TabsContent value="examples" className="space-y-4 pt-2">
        <ExamplesEditor control={control} register={register} language={language} />
      </TabsContent>

      <TabsContent value="image" className="space-y-4 pt-2">
        <ImagePicker
          value={{ image_url: imageUrl ?? null, image_source: imageSource ?? null }}
          onChange={(v) => {
            setValue("image_url", v.image_url, { shouldDirty: true });
            setValue("image_source", v.image_source, { shouldDirty: true });
          }}
          suggestedQuery={images[0]?.query || (language === "en" ? term : "")}
          suggestions={images}
          userId={userId}
          emoji={emoji}
        />
      </TabsContent>

      <TabsContent value="info" className="space-y-5 pt-2">
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
                      onClick={() =>
                        field.onChange(
                          on ? field.value!.filter((x) => x !== p) : [...(field.value ?? []), p],
                        )
                      }
                      className={cn(
                        "inline-flex min-h-10 items-center gap-1.5 rounded-full border px-3 text-sm transition-colors",
                        on
                          ? "border-primary bg-primary-soft font-medium text-fg"
                          : "border-input text-fg-muted hover:text-fg",
                      )}
                    >
                      {on && <Check className="size-3.5 text-primary" strokeWidth={2.5} aria-hidden />}
                      {POS[p].label}
                    </button>
                  );
                })}
              </div>
            </fieldset>
          )}
        />

        <div className="grid grid-cols-[1fr_6rem] gap-3">
          <Field label="Chủ đề" htmlFor="topic" error={errors.topic?.message}>
            <Input id="topic" list="topic-options" {...register("topic")} placeholder="Cảm xúc" />
            <datalist id="topic-options">
              {STANDARD_TOPICS.map((t) => (
                <option key={t} value={t} />
              ))}
            </datalist>
          </Field>
          <Field label="Emoji" htmlFor="emoji" error={errors.emoji?.message}>
            <Input id="emoji" {...register("emoji")} className="text-center text-xl" maxLength={8} />
          </Field>
        </div>

        <Field label="Cụm từ thường gặp">
          <CollocationsEditor control={control} register={register} language={language} />
        </Field>

        <div className="grid gap-4 sm:grid-cols-2">
          <Controller
            control={control}
            name="synonyms"
            render={({ field }) => (
              <Field label="Đồng nghĩa" htmlFor="synonyms">
                <TagInput
                  id="synonyms"
                  value={field.value ?? []}
                  onChange={field.onChange}
                  placeholder="Gõ rồi nhấn Enter"
                />
              </Field>
            )}
          />
          <Controller
            control={control}
            name="antonyms"
            render={({ field }) => (
              <Field label="Trái nghĩa" htmlFor="antonyms">
                <TagInput
                  id="antonyms"
                  value={field.value ?? []}
                  onChange={field.onChange}
                  placeholder="Gõ rồi nhấn Enter"
                />
              </Field>
            )}
          />
        </div>

        {language === "en" && (
          <Field label="Họ từ">
            <FamilyEditor control={control} register={register} language={language} />
          </Field>
        )}

        <Field label="Giải nghĩa tiếng Anh" htmlFor="meaning_en" error={errors.meaning_en?.message}>
          <Input
            id="meaning_en"
            {...register("meaning_en")}
            placeholder="Able to recover quickly from difficulties."
          />
        </Field>

        {language === "zh" ? (
          <div className="grid gap-4 sm:grid-cols-3">
            <Field label="Phồn thể" htmlFor="traditional">
              <Input
                id="traditional"
                {...register("lang_extra.traditional")}
                placeholder="堅強"
                className="font-hanzi"
              />
            </Field>
            <Field label="Âm Hán Việt" htmlFor="han_viet">
              <Input id="han_viet" {...register("lang_extra.han_viet")} placeholder="kiên cường" />
            </Field>
            <Field label="HSK" htmlFor="hsk">
              <select
                id="hsk"
                {...register("lang_extra.hsk.level")}
                className="h-11 w-full rounded-md border border-input bg-surface px-3 text-base outline-none focus-visible:border-primary focus-visible:ring-3 focus-visible:ring-primary-soft"
              >
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
              <select
                id="cefr"
                {...register("lang_extra.cefr")}
                className="h-11 w-full rounded-md border border-input bg-surface px-3 text-base outline-none focus-visible:border-primary focus-visible:ring-3 focus-visible:ring-primary-soft"
              >
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
                  <Input
                    key={k}
                    aria-label={l}
                    placeholder={l}
                    {...register(`lang_extra.verb_forms.${k}`)}
                  />
                ))}
              </div>
            </fieldset>
          </div>
        )}
      </TabsContent>

      <TabsContent value="note" className="space-y-4 pt-2">
        <Field label="Ghi chú riêng" htmlFor="personal_note" error={errors.personal_note?.message}>
          <Textarea
            id="personal_note"
            aria-label="Ghi chú riêng (mẹo nhớ)"
            {...register("personal_note")}
            rows={4}
            placeholder="Chỉ mình bạn thấy khi ôn."
            aria-invalid={Boolean(errors.personal_note) || undefined}
          />
        </Field>
      </TabsContent>
    </Tabs>
  );
}
