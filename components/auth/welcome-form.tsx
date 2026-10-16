"use client";

import { ArrowLeft, Check, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { completeOnboarding } from "@/lib/actions/profile";
import { cn } from "@/lib/utils";
import { displayNameSchema, usernameSchema } from "@/lib/validation";

type Lang = "en" | "zh";

const LANG_OPTIONS: { value: Lang[]; label: string; flag: string }[] = [
  { value: ["en"], label: "Tiếng Anh", flag: "🇬🇧" },
  { value: ["zh"], label: "Tiếng Trung", flag: "🇨🇳" },
  { value: ["en", "zh"], label: "Cả hai", flag: "🇬🇧 🇨🇳" },
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
      router.replace(next);
      router.refresh();
    });
  }

  return (
    <div className="notebook-card mt-8 px-6 py-7 sm:px-8">
      <p className="text-sm text-ink-soft">Bước {step}/2</p>
      {step === 1 ? (
        <form onSubmit={goNext} noValidate>
          <h1 className="mt-1 text-xl font-bold text-ink">Chào bạn! Bạn tên là gì?</h1>
          <div className="mt-6 space-y-5">
            <div className="space-y-1.5">
              <Label htmlFor="display_name">Tên hiển thị</Label>
              <Input
                id="display_name"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                autoComplete="name"
                className="h-12 rounded-[10px] text-base"
                aria-invalid={Boolean(errors.display_name) || undefined}
              />
              {errors.display_name && <p className="text-sm text-danger">{errors.display_name}</p>}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="username">Tên người dùng</Label>
              <div className="relative">
                <span className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-ink-soft">
                  @
                </span>
                <Input
                  id="username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value.toLowerCase())}
                  autoCapitalize="none"
                  autoCorrect="off"
                  spellCheck={false}
                  className="h-12 rounded-[10px] pl-7 text-base"
                  aria-invalid={Boolean(errors.username) || undefined}
                  aria-describedby="username-hint"
                />
              </div>
              <p
                id="username-hint"
                className={cn("text-sm", errors.username ? "text-danger" : "text-ink-soft")}
              >
                {errors.username ?? "Bạn bè tìm bạn bằng tên này."}
              </p>
            </div>
          </div>
          <Button type="submit" className="mt-8 h-12 w-full rounded-[10px] text-base">
            Tiếp tục
          </Button>
        </form>
      ) : (
        <div>
          <h1 className="mt-1 text-xl font-bold text-ink">Bạn đang học ngôn ngữ nào?</h1>
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
                    "flex min-h-14 items-center gap-3 rounded-[10px] border px-4 text-left text-base transition-colors",
                    selected
                      ? "border-ink-blue bg-wash-blue font-medium text-ink"
                      : "border-rule text-ink",
                  )}
                >
                  <span aria-hidden>{opt.flag}</span>
                  <span className="flex-1">{opt.label}</span>
                  {selected && <Check className="size-5 text-ink-blue" aria-hidden />}
                </button>
              );
            })}
          </div>

          <h2 className="mt-8 font-medium text-ink">Mỗi ngày học bao nhiêu từ mới?</h2>
          <div
            role="radiogroup"
            aria-label="Số từ mới mỗi ngày"
            className="mt-3 grid grid-cols-4 gap-2"
          >
            {DAILY_OPTIONS.map((n) => (
              <button
                key={n}
                type="button"
                role="radio"
                aria-checked={daily === n}
                onClick={() => setDaily(n)}
                className={cn(
                  "min-h-12 rounded-[10px] border text-base transition-colors",
                  daily === n
                    ? "border-ink-blue bg-wash-blue font-bold text-ink"
                    : "border-rule text-ink",
                )}
              >
                {n}
              </button>
            ))}
          </div>
          <p className="mt-2 text-sm text-ink-soft">Có thể đổi sau trong Cài đặt.</p>

          <div className="mt-8 flex gap-3">
            <Button
              type="button"
              variant="outline"
              className="h-12 rounded-[10px] px-4"
              onClick={() => setStep(1)}
              aria-label="Quay lại bước 1"
            >
              <ArrowLeft className="size-5" aria-hidden />
            </Button>
            <Button
              type="button"
              onClick={finish}
              disabled={pending}
              className="h-12 flex-1 gap-2 rounded-[10px] text-base"
            >
              {pending && <Loader2 className="size-5 animate-spin" aria-hidden />}
              Bắt đầu học
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
