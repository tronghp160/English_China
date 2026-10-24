"use client";

import type { AuthError } from "@supabase/supabase-js";
import { AlertCircle, Check, Eye, EyeOff, Loader2, Lock, Mail, User, type LucideIcon } from "lucide-react";
import { m } from "motion/react";
import { useId, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { passwordStrength } from "@/lib/password-strength";
import { cn } from "@/lib/utils";
import { useAuthBin } from "./auth-bin";

/**
 * supabase-js is ~65 KB gzip: load it when the user submits, not with the page.
 * Auth calls run in the browser on purpose: Supabase rate-limits sign-in and
 * sign-up per IP, and from a server action every user would share one IP.
 */
export async function loadSupabase() {
  const { createClient } = await import("@/lib/supabase/client");
  return createClient();
}

/** Where Supabase sends the user back after a password-reset email link. */
export function callbackUrl(next: string) {
  return `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}`;
}

/** Supabase Auth error → Vietnamese message. */
export function authErrorMessage(error: Pick<AuthError, "code" | "status" | "message">): string {
  switch (error.code) {
    case "invalid_credentials":
      return "Email hoặc mật khẩu không đúng.";
    case "email_not_confirmed":
      return "Email này chưa được xác nhận. Thử đăng nhập lại.";
    case "user_already_exists":
    case "email_exists":
      return "Email này đã có tài khoản. Hãy đăng nhập, hoặc dùng “Quên mật khẩu”.";
    case "weak_password":
      return "Mật khẩu quá yếu hoặc quá phổ biến. Chọn mật khẩu khác.";
    case "same_password":
      return "Mật khẩu mới phải khác mật khẩu cũ.";
    case "email_address_invalid":
      return "Email chưa đúng hoặc không nhận được thư. Kiểm tra lại địa chỉ.";
    case "email_address_not_authorized":
      return "Hệ thống email của Sổ Từ chưa gửi được tới địa chỉ này.";
    case "signup_disabled":
    case "email_provider_disabled":
      return "Hiện chưa mở đăng ký bằng email.";
    case "over_email_send_rate_limit":
      return "Đã gửi quá nhiều email. Đợi vài phút rồi thử lại.";
    case "over_request_rate_limit":
      return "Bạn thử quá nhiều lần. Đợi một lát rồi thử lại.";
    case "reauthentication_needed":
      return "Vì an toàn, hãy đăng xuất rồi đăng nhập lại trước khi đổi mật khẩu.";
  }
  if (error.status === 429) return "Bạn thử quá nhiều lần. Đợi một lát rồi thử lại.";
  return "Có lỗi khi kết nối máy chủ. Thử lại sau.";
}

/**
 * A text field with an icon on the left and a green check on the right once its content is good (REDESIGN_V3
 * §9.3). The label stays above it. Tells Bin (when there is one on the page) which field has the focus.
 */
function IconField({
  id,
  label,
  icon: Icon,
  valid,
  error,
  labelAction,
  right,
  describedBy,
  ...input
}: Omit<React.ComponentProps<"input">, "id"> & {
  id: string;
  label: string;
  icon: LucideIcon;
  /** Show the green check */
  valid?: boolean;
  error?: string;
  labelAction?: React.ReactNode;
  /** A button in the right corner (the eye of a password) */
  right?: React.ReactNode;
  describedBy?: string;
}) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-2">
        <Label htmlFor={id} className="text-[0.9375rem] font-semibold">
          {label}
        </Label>
        {labelAction}
      </div>
      <div className="group/field relative">
        <Icon
          aria-hidden
          strokeWidth={2}
          className="pointer-events-none absolute top-1/2 left-4 z-10 size-5 -translate-y-1/2 text-fg-muted transition-colors group-focus-within/field:text-primary"
        />
        <Input
          id={id}
          {...input}
          aria-invalid={Boolean(error) || undefined}
          aria-describedby={error ? `${id}-error` : describedBy}
          className={cn("h-[3.25rem] pl-12", right ? "pr-14" : valid && "pr-12", input.className)}
        />
        {right ? (
          <span className="absolute inset-y-0 right-1 flex items-center">{right}</span>
        ) : (
          valid &&
          !error && <Check aria-hidden strokeWidth={2.6} className="pointer-events-none absolute top-1/2 right-4 size-5 -translate-y-1/2 text-success-fg" />
        )}
      </div>
      {error && <FieldError id={`${id}-error`}>{error}</FieldError>}
    </div>
  );
}

export function EmailField({
  value,
  onChange,
  onBlur,
  error,
  valid,
}: {
  value: string;
  onChange: (v: string) => void;
  /** Run the check when the field loses the focus */
  onBlur?: () => void;
  error?: string;
  valid?: boolean;
}) {
  const bin = useAuthBin();
  return (
    <IconField
      id="email"
      label="Email"
      icon={Mail}
      type="email"
      inputMode="email"
      autoComplete="email"
      autoCapitalize="none"
      spellCheck={false}
      placeholder="ban@gmail.com"
      value={value}
      valid={valid}
      error={error}
      onChange={(e) => {
        onChange(e.target.value);
        bin?.typed(e.target.value.length);
      }}
      onFocus={() => {
        bin?.focus("email");
        bin?.typed(value.length);
      }}
      onBlur={() => {
        bin?.focus(null);
        onBlur?.();
      }}
    />
  );
}

/** "Tên của bạn" on the sign-up form. */
export function NameField({
  value,
  onChange,
  onBlur,
  error,
  valid,
}: {
  value: string;
  onChange: (v: string) => void;
  onBlur?: () => void;
  error?: string;
  valid?: boolean;
}) {
  const bin = useAuthBin();
  return (
    <IconField
      id="display_name"
      label="Tên của bạn"
      icon={User}
      autoComplete="name"
      placeholder="Ví dụ: Minh Anh"
      value={value}
      valid={valid}
      error={error}
      onChange={(e) => {
        onChange(e.target.value);
        bin?.typed(e.target.value.length);
      }}
      onFocus={() => {
        bin?.focus("name");
        bin?.typed(value.length);
      }}
      onBlur={() => {
        bin?.focus(null);
        onBlur?.();
      }}
    />
  );
}

/** Password input with a show/hide toggle: Bin covers its eyes while it is typed and peeks when it is shown. */
export function PasswordField({
  id = "password",
  label = "Mật khẩu",
  value,
  onChange,
  onBlur,
  autoComplete,
  error,
  hint,
  valid,
  labelAction,
  children,
}: {
  id?: string;
  label?: string;
  value: string;
  onChange: (v: string) => void;
  onBlur?: () => void;
  autoComplete: "current-password" | "new-password";
  error?: string;
  hint?: string;
  valid?: boolean;
  labelAction?: React.ReactNode;
  /** Under the field, e.g. the strength meter */
  children?: React.ReactNode;
}) {
  const bin = useAuthBin();
  const [shown, setShown] = useState(false);
  const toggle = () => {
    const next = !shown;
    setShown(next);
    bin?.shown(next);
  };
  return (
    <div
      className="space-y-2"
      onFocus={() => bin?.focus("password")}
      onBlur={(e) => {
        // moving from the input to the eye button is still "in the password field"
        if (e.currentTarget.contains(e.relatedTarget as Node | null)) return;
        bin?.focus(null);
        onBlur?.();
      }}
    >
      <IconField
        id={id}
        label={label}
        icon={Lock}
        type={shown ? "text" : "password"}
        autoComplete={autoComplete}
        autoCapitalize="none"
        spellCheck={false}
        value={value}
        valid={valid}
        error={error}
        labelAction={labelAction}
        describedBy={hint ? `${id}-hint` : undefined}
        onChange={(e) => onChange(e.target.value)}
        right={
          <button
            type="button"
            onClick={toggle}
            aria-label={shown ? "Ẩn mật khẩu" : "Hiện mật khẩu"}
            aria-pressed={shown}
            aria-controls={id}
            className={cn(
              "grid size-11 place-items-center rounded-md transition-colors hover:text-fg",
              shown ? "text-primary" : "text-fg-muted",
            )}
          >
            {shown ? <EyeOff className="size-5" strokeWidth={2} aria-hidden /> : <Eye className="size-5" strokeWidth={2} aria-hidden />}
          </button>
        }
      />
      {!error && hint && (
        <p id={`${id}-hint`} className="text-sm text-fg-muted">
          {hint}
        </p>
      )}
      {children}
    </div>
  );
}

const BAR_TONES = ["bg-surface-3", "bg-danger", "bg-rate-hard", "bg-c-sun", "bg-success"] as const;
const LABEL_TONES = ["", "text-danger-fg", "text-due-fg", "text-streak-fg", "text-success-fg"] as const;

/** Four bars, a word for how strong it is and what to add (REDESIGN_V3 §9.3), plus two checks that tick as you type. */
export function PasswordStrength({ password }: { password: string }) {
  const s = passwordStrength(password);
  return (
    <div className="space-y-2" aria-live="polite">
      <div className="grid grid-cols-4 gap-1.5" aria-hidden>
        {[1, 2, 3, 4].map((n) => (
          <m.span
            key={n}
            className={cn("h-1.5 rounded-full transition-colors duration-200", n <= s.score ? BAR_TONES[s.score] : "bg-surface-3")}
            animate={{ scaleY: n <= s.score ? 1 : 0.8 }}
          />
        ))}
      </div>
      {s.score > 0 && (
        <div className="flex flex-wrap items-baseline justify-between gap-x-3 text-[0.9375rem] font-semibold">
          <span className={LABEL_TONES[s.score]}>{s.label}</span>
          {s.hint && <span className="text-fg-muted">{s.hint}</span>}
        </div>
      )}
      <ul className="space-y-1 text-sm">
        <Rule ok={s.checks.length}>Ít nhất 8 ký tự</Rule>
        <Rule ok={s.checks.letterAndDigit}>Có cả chữ và số</Rule>
      </ul>
    </div>
  );
}

function Rule({ ok, children }: { ok: boolean; children: React.ReactNode }) {
  return (
    <li className={cn("flex items-center gap-2", ok ? "font-semibold text-success-fg" : "text-fg-muted")}>
      {ok ? (
        <Check className="size-4 shrink-0" strokeWidth={3} aria-hidden />
      ) : (
        <span aria-hidden className="size-4 shrink-0 rounded-full border-2 border-border-strong" />
      )}
      {children}
      <span className="sr-only">{ok ? " (đủ)" : " (chưa đủ)"}</span>
    </li>
  );
}

/** Message under a field: red with a small alert icon. */
export function FieldError({ id, children }: { id?: string; children: React.ReactNode }) {
  return (
    <p id={id} className="animate-in fade-in-0 slide-in-from-top-1 flex items-start gap-1.5 text-sm text-danger-fg duration-200">
      <AlertCircle className="mt-0.5 size-3.5 shrink-0" aria-hidden />
      {children}
    </p>
  );
}

/** Form-level message: a tinted box with a 3px bar on the left (red for errors, green for good news). */
export function FormAlert({ children, tone = "error" }: { children: React.ReactNode; tone?: "error" | "success" }) {
  return (
    <div
      role={tone === "error" ? "alert" : "status"}
      className={cn(
        "rounded-md border-l-[3px] px-4 py-3 text-sm",
        tone === "error" ? "border-danger bg-danger-soft text-danger-fg" : "border-success bg-success-soft text-fg",
      )}
    >
      {children}
    </div>
  );
}

/**
 * The big button under an auth form: a spinner and `busyLabel` (announced politely) while it works, a check when it
 * worked. The label keeps its words ("Đăng nhập") so it can be found by name.
 */
export function SubmitButton({
  busy,
  done,
  busyLabel,
  children,
}: {
  busy: boolean;
  done?: boolean;
  busyLabel: string;
  children: React.ReactNode;
}) {
  const id = useId();
  return (
    <>
      <Button type="submit" variant="pressable" size="xl" className="w-full" disabled={busy || done} aria-describedby={id}>
        {busy && <Loader2 className="animate-spin" aria-hidden />}
        {done && <Check strokeWidth={3} aria-hidden />}
        {busy ? busyLabel : children}
      </Button>
      <span id={id} aria-live="polite" className="sr-only">
        {busy ? busyLabel : done ? "Xong" : ""}
      </span>
    </>
  );
}

export const PASSWORD_HINT = "Ít nhất 8 ký tự, có cả chữ và số.";
