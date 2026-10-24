"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { Controller, useForm } from "react-hook-form";
import { toast } from "sonner";
import { LangFlag } from "@/components/lang-flag";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { updateSettings } from "@/lib/actions/profile";
import { cn } from "@/lib/utils";
import { settingsSchema, type SettingsInput } from "@/lib/validation";

const LANGS = [
  { value: "en", label: "Tiếng Anh" },
  { value: "zh", label: "Tiếng Trung" },
] as const;

function Field({
  id,
  label,
  error,
  hint,
  children,
}: {
  id: string;
  label: string;
  error?: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id}>{label}</Label>
      {children}
      {(error || hint) && (
        <p className={cn("text-sm", error ? "text-danger-fg" : "text-fg-muted")}>{error ?? hint}</p>
      )}
    </div>
  );
}

export function SettingsForm({ initial }: { initial: SettingsInput }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const form = useForm<SettingsInput>({ resolver: zodResolver(settingsSchema), defaultValues: initial });
  const { register, handleSubmit, formState, setError, control } = form;
  const e = formState.errors;

  const onSubmit = handleSubmit((values) =>
    startTransition(async () => {
      const res = await updateSettings(values);
      if (!res.ok) {
        Object.entries(res.fieldErrors ?? {}).forEach(([k, m]) =>
          setError(k as keyof SettingsInput, { message: m }),
        );
        toast.error(res.error);
        return;
      }
      toast.success("Đã lưu cài đặt");
      router.refresh();
    }),
  );

  return (
    <form onSubmit={onSubmit} className="mt-6 space-y-5" noValidate>
      <Field id="display_name" label="Tên hiển thị" error={e.display_name?.message}>
        <Input id="display_name" className="h-11 rounded-md" {...register("display_name")} />
      </Field>
      <Field id="username" label="Tên người dùng" error={e.username?.message}>
        <Input
          id="username"
          className="h-11 rounded-md"
          autoCapitalize="none"
          spellCheck={false}
          {...register("username")}
        />
      </Field>
      <div className="grid grid-cols-2 gap-4">
        <Field id="daily_new_limit" label="Từ mới mỗi ngày" error={e.daily_new_limit?.message}>
          <Input
            id="daily_new_limit"
            type="number"
            inputMode="numeric"
            min={0}
            max={200}
            className="h-11 rounded-md"
            {...register("daily_new_limit")}
          />
        </Field>
        <Field
          id="daily_goal"
          label="Mục tiêu ôn mỗi ngày"
          error={e.daily_goal?.message}
          hint="Số lượt ôn"
        >
          <Input
            id="daily_goal"
            type="number"
            inputMode="numeric"
            min={1}
            max={1000}
            className="h-11 rounded-md"
            {...register("daily_goal")}
          />
        </Field>
      </div>
      <fieldset>
        <legend className="mb-2 text-sm font-medium">Ngôn ngữ đang học</legend>
        <Controller
          control={control}
          name="study_langs"
          render={({ field }) => (
            <div className="flex flex-wrap gap-2">
              {LANGS.map((l) => {
                const checked = field.value.includes(l.value);
                return (
                  <label
                    key={l.value}
                    className={cn(
                      "flex min-h-11 cursor-pointer items-center gap-2 rounded-md border px-4 text-sm",
                      checked ? "border-primary bg-primary-soft font-medium" : "border-border",
                    )}
                  >
                    <input
                      type="checkbox"
                      className="sr-only"
                      checked={checked}
                      onChange={() =>
                        field.onChange(
                          checked ? field.value.filter((v) => v !== l.value) : [...field.value, l.value],
                        )
                      }
                    />
                    <LangFlag lang={l.value} className="mr-1.5" />
                    {l.label}
                  </label>
                );
              })}
            </div>
          )}
        />
        {e.study_langs && <p className="mt-1.5 text-sm text-danger-fg">{e.study_langs.message}</p>}
      </fieldset>
      <Button type="submit" disabled={pending} className="h-11 gap-2 rounded-md px-5">
        {pending && <Loader2 className="size-4 animate-spin" aria-hidden />}
        Lưu thay đổi
      </Button>
    </form>
  );
}
