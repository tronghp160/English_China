"use client";

import { ArrowLeft, Check, Loader2 } from "lucide-react";
import { AnimatePresence, m } from "motion/react";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";
import { toast } from "sonner";
import { fireConfetti } from "@/components/fx/confetti";
import { Pup } from "@/components/mascot/pup";
import { useBinAction } from "@/components/mascot/use-bin";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { completeOnboarding, updatePrefs } from "@/lib/actions/profile";
import { addSampleDecks } from "@/lib/actions/sample";
import { cn } from "@/lib/utils";
import { displayNameSchema, usernameSchema } from "@/lib/validation";
import { FieldError } from "./auth-shared";

type Lang = "en" | "zh";
type Step = 1 | 2 | 3;

const LANG_OPTIONS: { value: Lang[]; label: string; hint: string }[] = [
  { value: ["en"], label: "Tiếng Anh", hint: "Giao tiếp, IELTS, TOEIC" },
  { value: ["zh"], label: "Tiếng Trung", hint: "Pinyin, chữ Hán, HSK" },
  { value: ["en", "zh"], label: "Cả hai", hint: "Học song song hai thứ tiếng" },
];

const DAILY_OPTIONS = [5, 10, 15, 20] as const;
const DEFAULT_DOG = "Bin";

/** Slides the steps sideways: forward comes in from the right, back from the left. */
const SLIDE = {
  enter: (dir: number) => ({ x: dir * 40, opacity: 0 }),
  center: { x: 0, opacity: 1 },
  exit: (dir: number) => ({ x: dir * -40, opacity: 0 }),
};

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
  const [step, setStep] = useState<Step>(1);
  const [dir, setDir] = useState(1);
  const [displayName, setDisplayName] = useState(initialName);
  const [username, setUsername] = useState(initialUsername);
  const [dogName, setDogName] = useState(DEFAULT_DOG);
  const [langs, setLangs] = useState<Lang[]>(["en"]);
  const [daily, setDaily] = useState<(typeof DAILY_OPTIONS)[number]>(15);
  const [withSamples, setWithSamples] = useState(true);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [pending, startTransition] = useTransition();
  const bin = useBinAction("happy");
  const play = useRef(bin.play);
  useEffect(() => {
    play.current = bin.play;
  }, [bin.play]);

  // Each step has its own little show: wave, a nod for the choice, a dance when it is time to start.
  useEffect(() => {
    const t = setTimeout(() => play.current(step === 1 ? "wave" : step === 2 ? "nod" : "dance"), 300);
    return () => clearTimeout(t);
  }, [step]);

  // Bin nods while the dog's name is typed, at most every 600 ms
  const lastNod = useRef(0);
  function nameChanged(v: string) {
    setDogName(v);
    const now = Date.now();
    if (now - lastNod.current > 600) {
      lastNod.current = now;
      play.current("nod");
    }
  }

  const dog = dogName.trim() || DEFAULT_DOG;
  const firstName = displayName.trim().split(/\s+/).at(-1) ?? "";

  function go(to: Step) {
    setDir(to > step ? 1 : -1);
    setStep(to);
  }

  function goNext(e: React.FormEvent) {
    e.preventDefault();
    const next: Record<string, string> = {};
    const n = displayNameSchema.safeParse(displayName);
    if (!n.success) next.display_name = n.error.issues[0].message;
    const u = usernameSchema.safeParse(username);
    if (!u.success) next.username = u.error.issues[0].message;
    if (dogName.trim().length > 20) next.dog_name = "Tối đa 20 ký tự";
    setErrors(next);
    if (Object.keys(next).length === 0) go(2);
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
        if (res.fieldErrors?.username || res.fieldErrors?.display_name) go(1);
        toast.error(res.error);
        return;
      }
      if (dog !== DEFAULT_DOG) await updatePrefs({ mascot_name: dog });
      if (withSamples) {
        const added = await addSampleDecks();
        if (added.ok) toast.success(`Đã thêm ${added.data.decks} bộ từ mẫu để bạn học thử.`);
      }
      const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      if (!reduced) {
        void fireConfetti("big");
        await new Promise((r) => setTimeout(r, 700));
      }
      router.replace(next);
      router.refresh();
    });
  }

  const picked = LANG_OPTIONS.find((o) => o.value.join() === langs.join());

  return (
    <div className="mt-6">
      <div className="flex items-center gap-3">
        <div className="flex flex-1 gap-1.5" aria-hidden>
          {[1, 2, 3].map((n) => (
            <span key={n} className={cn("h-2 flex-1 rounded-full transition-colors", n <= step ? "bg-primary" : "bg-surface-3")} />
          ))}
        </div>
        <p className="text-sm font-medium text-fg-muted">Bước {step}/3</p>
      </div>

      <AnimatePresence mode="wait" custom={dir} initial={false}>
        <m.div
          key={step}
          custom={dir}
          variants={SLIDE}
          initial="enter"
          animate="center"
          exit="exit"
          transition={{ duration: 0.2, ease: "easeOut" }}
        >
          {step === 1 && (
            <form onSubmit={goNext} noValidate>
              <h1 className="mt-6 text-xl">Làm quen nào</h1>
              <div className="mt-3 flex items-end gap-2">
                <Pup mood={bin.mood} action={bin.action} size={112} className="shrink-0" />
                <p
                  aria-live="polite"
                  className="mb-3 min-w-0 rounded-lg rounded-bl-[4px] bg-surface px-3.5 py-2.5 text-[0.9375rem] leading-snug font-medium text-fg shadow-sm dark:border dark:border-border"
                >
                  Chào {firstName || "bạn"}! Mình là {dog}, sẽ học cùng bạn.
                </p>
              </div>
              <div className="mt-5 space-y-5">
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
                <div className="space-y-1.5">
                  <Label htmlFor="dog_name">Tên bạn cún</Label>
                  <Input
                    id="dog_name"
                    value={dogName}
                    onChange={(e) => nameChanged(e.target.value)}
                    maxLength={20}
                    autoComplete="off"
                    aria-invalid={Boolean(errors.dog_name) || undefined}
                    aria-describedby="dog-hint"
                  />
                  {errors.dog_name ? (
                    <FieldError id="dog-hint">{errors.dog_name}</FieldError>
                  ) : (
                    <p id="dog-hint" className="text-sm text-fg-muted">
                      Đặt tên cho bạn đồng hành, đổi sau trong Cài đặt cũng được.
                    </p>
                  )}
                </div>
              </div>
              <Button type="submit" variant="pressable" size="xl" className="mt-8 w-full">
                Tiếp tục
              </Button>
            </form>
          )}

          {step === 2 && (
            <div>
              <h1 className="mt-6 text-xl">Bạn đang học ngôn ngữ nào?</h1>
              <div role="radiogroup" aria-label="Ngôn ngữ đang học" className="mt-5 grid grid-cols-2 gap-3">
                {LANG_OPTIONS.map((opt, i) => {
                  const selected = opt.value.join() === langs.join();
                  const both = opt.value.length === 2;
                  const tone = opt.value[0] === "zh" && !both ? "zh" : "en";
                  return (
                    <button
                      key={opt.label}
                      type="button"
                      role="radio"
                      aria-checked={selected}
                      onClick={() => setLangs(opt.value)}
                      className={cn(
                        "relative flex flex-col gap-2 rounded-lg border-2 p-4 text-left transition-[transform,background-color,border-color] duration-200 active:scale-[0.97]",
                        both ? "col-span-2 min-h-16 flex-row items-center gap-4 py-3" : "min-h-36",
                        selected
                          ? cn("border-primary scale-[1.02]", both ? "bg-primary-soft" : tone === "zh" ? "bg-zh-soft" : "bg-en-soft")
                          : "border-border bg-surface hover:border-border-strong",
                      )}
                    >
                      <span aria-hidden className={cn("flex leading-tight", both ? "w-24 shrink-0 flex-col text-xl" : "text-[1.75rem]")}>
                        {opt.value.includes("en") && <span className="font-extrabold tracking-[-0.03em] text-en-fg">{both ? "resilient" : "Hello"}</span>}
                        {opt.value.includes("zh") && <span className="font-hanzi-sans font-bold text-zh-fg">{both ? "坚强" : "坚强"}</span>}
                      </span>
                      <span className="flex-1">
                        <span className="block font-bold">{opt.label}</span>
                        <span className="block text-sm text-fg-muted">{opt.hint}</span>
                      </span>
                      {selected && (
                        <span aria-hidden className={cn("absolute top-3 right-3 grid size-6 place-items-center rounded-full bg-primary text-on-primary", i === 2 && "top-1/2 -translate-y-1/2")}>
                          <Check className="size-4" strokeWidth={3} />
                        </span>
                      )}
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
                      "h-11 min-w-14 rounded-full px-3 text-sm font-medium tabular-nums transition-colors",
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
                <Button type="button" variant="outline" size="icon-lg" className="h-14 w-14 rounded-lg" onClick={() => go(1)} aria-label="Quay lại bước 1">
                  <ArrowLeft aria-hidden />
                </Button>
                <Button type="button" variant="pressable" size="xl" onClick={() => go(3)} className="flex-1">
                  Tiếp tục
                </Button>
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="text-center">
              <Pup mood={bin.mood} action={bin.action} size={150} className="mx-auto mt-4" />
              <h1 className="mt-2 text-2xl">Sẵn sàng rồi!</h1>
              <p className="mt-1 text-fg-muted">
                {dog} và {firstName || "bạn"} cùng bắt đầu nào.
              </p>
              <ul className="mt-6 space-y-2 text-left text-[0.9375rem]">
                <Summary label="Bạn" value={`${displayName.trim()} · @${username}`} />
                <Summary label="Học" value={picked?.label ?? ""} />
                <Summary label="Từ mới mỗi ngày" value={String(daily)} />
                <Summary label="Bộ từ mẫu" value={withSamples ? "Có" : "Không"} />
              </ul>
              <div className="mt-8 flex gap-3">
                <Button type="button" variant="outline" size="icon-lg" className="h-14 w-14 rounded-lg" onClick={() => go(2)} aria-label="Quay lại bước 2" disabled={pending}>
                  <ArrowLeft aria-hidden />
                </Button>
                <Button type="button" variant="pressable" size="xl" onClick={finish} disabled={pending} className="flex-1">
                  {pending && <Loader2 className="animate-spin" aria-hidden />}
                  Bắt đầu học
                </Button>
              </div>
            </div>
          )}
        </m.div>
      </AnimatePresence>
    </div>
  );
}

function Summary({ label, value }: { label: string; value: string }) {
  return (
    <li className="flex items-center justify-between gap-4 rounded-md bg-surface-2 px-4 py-2.5">
      <span className="text-fg-muted">{label}</span>
      <span className="min-w-0 truncate font-semibold text-fg">{value}</span>
    </li>
  );
}
