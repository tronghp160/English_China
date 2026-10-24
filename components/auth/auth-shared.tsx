"use client";

import type { AuthError } from "@supabase/supabase-js";
import { AlertCircle, Eye, EyeOff } from "lucide-react";
import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

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

export function EmailField({
  value,
  onChange,
  error,
}: {
  value: string;
  onChange: (v: string) => void;
  error?: string;
}) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor="email">Email</Label>
      <Input
        id="email"
        type="email"
        inputMode="email"
        autoComplete="email"
        autoCapitalize="none"
        spellCheck={false}
        placeholder="ban@gmail.com"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        aria-invalid={Boolean(error) || undefined}
        aria-describedby={error ? "email-error" : undefined}
      />
      {error && <FieldError id="email-error">{error}</FieldError>}
    </div>
  );
}

/** Password input with a show/hide toggle. */
export function PasswordField({
  id = "password",
  label = "Mật khẩu",
  value,
  onChange,
  autoComplete,
  error,
  hint,
  labelAction,
}: {
  id?: string;
  label?: string;
  value: string;
  onChange: (v: string) => void;
  autoComplete: "current-password" | "new-password";
  error?: string;
  hint?: string;
  labelAction?: React.ReactNode;
}) {
  const [shown, setShown] = useState(false);
  const describedBy = error ? `${id}-error` : hint ? `${id}-hint` : undefined;
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between gap-2">
        <Label htmlFor={id}>{label}</Label>
        {labelAction}
      </div>
      <div className="relative">
        <Input
          id={id}
          type={shown ? "text" : "password"}
          autoComplete={autoComplete}
          autoCapitalize="none"
          spellCheck={false}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="pr-12"
          aria-invalid={Boolean(error) || undefined}
          aria-describedby={describedBy}
        />
        <button
          type="button"
          onClick={() => setShown((s) => !s)}
          aria-label={shown ? "Ẩn mật khẩu" : "Hiện mật khẩu"}
          aria-pressed={shown}
          aria-controls={id}
          className="absolute inset-y-0 right-0 grid w-11 place-items-center rounded-r-btn text-ink-soft hover:text-ink"
        >
          {shown ? <EyeOff className="size-[1.125rem]" strokeWidth={1.75} aria-hidden /> : <Eye className="size-[1.125rem]" strokeWidth={1.75} aria-hidden />}
        </button>
      </div>
      {error ? (
        <FieldError id={`${id}-error`}>{error}</FieldError>
      ) : (
        hint && (
          <p id={`${id}-hint`} className="text-sm text-ink-soft">
            {hint}
          </p>
        )
      )}
    </div>
  );
}

/** Message under a field: seal red with a small alert icon. */
export function FieldError({ id, children }: { id?: string; children: React.ReactNode }) {
  return (
    <p id={id} className="flex items-start gap-1.5 text-sm text-seal-text">
      <AlertCircle className="mt-0.5 size-3.5 shrink-0" aria-hidden />
      {children}
    </p>
  );
}

/** Form-level message: a tinted box with a 3px bar on the left (seal for errors, leaf for good news). */
export function FormAlert({ children, tone = "error" }: { children: React.ReactNode; tone?: "error" | "success" }) {
  return (
    <div
      role={tone === "error" ? "alert" : "status"}
      className={cn(
        "rounded-btn border-l-[3px] px-4 py-3 text-sm",
        tone === "error" ? "border-seal bg-tint-seal text-seal-text" : "border-leaf bg-tint-leaf text-ink",
      )}
    >
      {children}
    </div>
  );
}

export const PASSWORD_HINT = "Ít nhất 8 ký tự, có cả chữ và số.";
