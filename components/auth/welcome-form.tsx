"use client";

import { ArrowLeft, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { FieldError } from "./auth-shared";
import { Switch } from "@/components/ui/switch";
import { completeOnboarding } from "@/lib/actions/profile";
import { addSampleDecks } from "@/lib/actions/sample";
import { cn } from "@/lib/utils";
import { displayNameSchema, usernameSchema } from "@/lib/validation";

type Lang = "en" | "zh";

const LANG_OPTIONS: { value: Lang[]; label: string; hint: string }[] = [
  { value: ["en"], label: "Tiếng Anh", hint: "Giao tiếp, IELTS, TOEIC" },
  { value: ["zh"], label: "Tiếng Trung", hint: "Pinyin, chữ Hán, HSK" },
  { value: ["en", "zh"], label: "Cả hai", hint: "Học song song hai thứ tiếng" },
];

const DAILY_OPTIONS = [5, 10, 15, 20] as const;

export function WelcomeForm({
  initialName,
  initialUsername,
  next = "/today",
}: {
  initialName: string;
  initialUsername: string;
  next?: string;
}) {
  const router = useRouter();
  const [step, setStep] = useState<1 | 2>(1);
  const [displayName, setDisplayName] = useState(initialName);
  const [username, setUsername] = useState(initialUsername);
  const [langs, setLangs] = useState<Lang[]>(["en"]);
  const [daily, setDaily] = useState<(typeof DAILY_OPTIONS)[number]>(15);
  const [withSamples, setWithSamples] = useState(true);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [pending, startTransition] = useTransition();

  function goNext(e: React.FormEvent) {
    e.preventDefault();
    const next: Record<string, string> = {};
    const n = displayNameSchema.safeParse(displayName);
    if (!n.success) next.display_name = n.error.issues[0].message;
    const u = usernameSchema.safeParse(username);
    if (!u.success) next.username = u.error.issues[0].message;
    setErrors(next);
    if (Object.keys(next).length === 0) setStep(2);
  }

  function finish() {
    startTransition(async () => {
      const res = await completeOnboarding({
        display_name: displayName,
        username,
        study_langs: langs,
        daily_new_limit: daily,
      });
      if (!res.ok) {
        setErrors(res.fieldErrors ?? {});
        if (res.fieldErrors?.username || res.fieldErrors?.display_name) setStep(1);
        toast.error(res.error);
        return;
      }
      if (withSamples) {
        const added = await addSampleDecks();
        if (added.ok) toast.success(`Đã thêm ${added.data.decks} bộ từ mẫu để bạn học thử.`);
      }
      router.replace(next);
      router.refresh();
    });
  }

  return (
    <div className="mt-8">
      <div className="flex items-center gap-3">
        <div className="flex flex-1 gap-1.5" aria-hidden>
          {[1, 2].map((n) => (
            <span key={n} className={cn("h-2 flex-1 rounded-full transition-colors", n <= step ? "bg-primary" : "bg-surface-3")} />
          ))}
        </div>
        <p className="text-sm font-medium text-fg-muted">Bước {step}/2</p>
      </div>
      {step === 1 ? (
        <form onSubmit={goNext} noValidate>
          <h1 className="mt-8 text-xl">Bạn tên là gì?</h1>
          <div className="mt-6 space-y-5">
            <div className="space-y-1.5">
              <Label htmlFor="display_name">Tên hiển thị</Label>
              <Input
                id="display_name"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                autoComplete="name"
                aria-invalid={Boolean(errors.display_name) || undefined}
              />
              {errors.display_name && <FieldError>{errors.display_name}</FieldError>}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="username">Tên người dùng</Label>
              <div className="relative">
                <span className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-fg-muted">@</span>
                <Input
                  id="username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value.toLowerCase())}
                  autoCapitalize="none"
                  autoCorrect="off"
                  spellCheck={false}
                  className="pl-7"
                  aria-invalid={Boolean(errors.username) || undefined}
                  aria-describedby="username-hint"
                />
              </div>
              {errors.username ? (
                <FieldError id="username-hint">{errors.username}</FieldError>
              ) : (
                <p id="username-hint" className="text-sm text-fg-muted">
                  Bạn bè tìm bạn bằng tên này.
                </p>
              )}
            </div>
          </div>
          <Button type="submit" variant="pressable" size="xl" className="mt-8 w-full">
            Tiếp tục
          </Button>
        </form>
      ) : (
        <div>
          <h1 className="mt-8 text-xl">Bạn đang học ngôn ngữ nào?</h1>
          <div role="radiogroup" aria-label="Ngôn ngữ đang học" className="mt-5 grid gap-2">
            {LANG_OPTIONS.map((opt) => {
              const selected = opt.value.join() === langs.join();
              return (
                <button
                  key={opt.label}
                  type="button"
                  role="radio"
                  aria-checked={selected}
                  onClick={() => setLangs(opt.value)}
                  className={cn(
                    "flex min-h-16 items-center gap-4 rounded-lg border-2 px-4 py-2 text-left transition-colors",
                    selected ? "border-primary bg-primary-soft" : "border-border bg-surface hover:border-border-strong",
                  )}
                >
                  <span aria-hidden className="flex w-20 shrink-0 flex-col text-xl leading-tight text-fg">
                    {opt.value.includes("en") && <span className="font-extrabold tracking-[-0.03em] text-en-fg">resilient</span>}
                    {opt.value.includes("zh") && <span className="font-hanzi-sans font-bold text-zh-fg">坚强</span>}
                  </span>
                  <span className="flex-1">
                    <span className="block font-semibold">{opt.label}</span>
                    <span className="block text-sm text-fg-muted">{opt.hint}</span>
                  </span>
                </button>
              );
            })}
          </div>

          <h2 className="mt-8 text-base">Mỗi ngày học bao nhiêu từ mới?</h2>
          <div role="radiogroup" aria-label="Số từ mới mỗi ngày" className="mt-3 inline-flex gap-0.5 rounded-full bg-surface-2 p-1">
            {DAILY_OPTIONS.map((n) => (
              <button
                key={n}
                type="button"
                role="radio"
                aria-checked={daily === n}
                onClick={() => setDaily(n)}
                className={cn(
                  "h-9 min-w-14 rounded-full px-3 text-sm font-medium tabular-nums transition-colors",
                  daily === n ? "bg-surface text-fg shadow-sm" : "text-fg-muted hover:text-fg",
                )}
              >
                {n}
              </button>
            ))}
          </div>
          <p className="mt-2 text-sm text-fg-muted">Có thể đổi sau trong Cài đặt.</p>

          <label className="mt-6 flex items-center justify-between gap-4 rounded-lg bg-surface-2 px-4 py-3">
            <span>
              <span className="block font-medium text-fg">Thêm bộ từ mẫu</span>
              <span className="block text-sm text-fg-muted">Có sẵn vài chục từ để ôn thử ngay hôm nay.</span>
            </span>
            <Switch checked={withSamples} onCheckedChange={setWithSamples} aria-label="Thêm bộ từ mẫu" />
          </label>

          <div className="mt-8 flex gap-3">
            <Button type="button" variant="outline" size="icon-lg" className="h-14 w-14 rounded-lg" onClick={() => setStep(1)} aria-label="Quay lại bước 1">
              <ArrowLeft aria-hidden />
            </Button>
            <Button type="button" variant="pressable" size="xl" onClick={finish} disabled={pending} className="flex-1">
              {pending && <Loader2 className="animate-spin" aria-hidden />}
              Bắt đầu học
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
