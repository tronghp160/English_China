"use client";

import type { AuthError } from "@supabase/supabase-js";
import { Eye, EyeOff, Loader2 } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
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

/** Where Supabase sends the user back after Google, an email link or a password reset. */
export function callbackUrl(next: string) {
  return `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}`;
}

/** Supabase Auth error → Vietnamese message. */
export function authErrorMessage(error: Pick<AuthError, "code" | "status" | "message">): string {
  switch (error.code) {
    case "invalid_credentials":
      return "Email hoặc mật khẩu không đúng.";
    case "email_not_confirmed":
      return "Email này chưa được xác nhận. Mở email xác nhận Sổ Từ đã gửi, hoặc gửi lại bên dưới.";
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
      return "Hệ thống email của Sổ Từ chưa gửi được tới địa chỉ này. Hãy dùng “Tiếp tục với Google”.";
    case "signup_disabled":
    case "email_provider_disabled":
      return "Hiện chưa mở đăng ký bằng email. Hãy dùng “Tiếp tục với Google”.";
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

function GoogleIcon() {
  return (
    <svg viewBox="0 0 24 24" className="size-5" aria-hidden>
      <path fill="#4285F4" d="M23.5 12.3c0-.8-.1-1.6-.2-2.3H12v4.4h6.5a5.6 5.6 0 0 1-2.4 3.6v3h3.9c2.2-2.1 3.5-5.1 3.5-8.7Z" />
      <path fill="#34A853" d="M12 24c3.2 0 6-1.1 8-2.9l-3.9-3c-1.1.7-2.5 1.2-4.1 1.2-3.1 0-5.8-2.1-6.7-5H1.3v3.1A12 12 0 0 0 12 24Z" />
      <path fill="#FBBC05" d="M5.3 14.3a7.2 7.2 0 0 1 0-4.6V6.6h-4a12 12 0 0 0 0 10.8l4-3.1Z" />
      <path fill="#EA4335" d="M12 4.8c1.8 0 3.3.6 4.6 1.8l3.4-3.4A12 12 0 0 0 1.3 6.6l4 3.1c.9-2.9 3.6-4.9 6.7-4.9Z" />
    </svg>
  );
}

export function GoogleButton({ next, disabled, onError }: { next: string; disabled?: boolean; onError: (m: string) => void }) {
  const [busy, setBusy] = useState(false);
  return (
    <Button
      type="button"
      variant="outline"
      className="h-12 w-full gap-3 rounded-[10px] text-base"
      disabled={disabled || busy}
      onClick={async () => {
        setBusy(true);
        const { error } = await (await loadSupabase()).auth.signInWithOAuth({
          provider: "google",
          options: { redirectTo: callbackUrl(next) },
        });
        if (error) {
          setBusy(false);
          onError(
            error.code === "validation_failed" || error.status === 400
              ? "Đăng nhập Google chưa được bật. Hãy dùng email."
              : "Không mở được đăng nhập Google. Thử lại hoặc dùng email.",
          );
        }
      }}
    >
      {busy ? <Loader2 className="size-5 animate-spin" aria-hidden /> : <GoogleIcon />}
      Tiếp tục với Google
    </Button>
  );
}

export function OrDivider({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-3 text-sm text-ink-soft">
      <span className="h-px flex-1 bg-rule" />
      {children}
      <span className="h-px flex-1 bg-rule" />
    </div>
  );
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
        className="h-12 rounded-[10px] text-base"
        aria-invalid={Boolean(error) || undefined}
        aria-describedby={error ? "email-error" : undefined}
      />
      {error && (
        <p id="email-error" className="text-sm text-danger">
          {error}
        </p>
      )}
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
          className="h-12 rounded-[10px] pr-12 text-base"
          aria-invalid={Boolean(error) || undefined}
          aria-describedby={describedBy}
        />
        <button
          type="button"
          onClick={() => setShown((s) => !s)}
          aria-label={shown ? "Ẩn mật khẩu" : "Hiện mật khẩu"}
          aria-pressed={shown}
          aria-controls={id}
          className="absolute inset-y-0 right-0 grid w-12 place-items-center rounded-r-[10px] text-ink-soft hover:text-ink"
        >
          {shown ? <EyeOff className="size-5" aria-hidden /> : <Eye className="size-5" aria-hidden />}
        </button>
      </div>
      {error ? (
        <p id={`${id}-error`} className="text-sm text-danger">
          {error}
        </p>
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

export function FormAlert({ children, tone = "error" }: { children: React.ReactNode; tone?: "error" | "success" }) {
  return (
    <div
      role={tone === "error" ? "alert" : "status"}
      className={cn(
        "rounded-[10px] px-4 py-3 text-sm",
        tone === "error" ? "bg-wash-red text-danger" : "bg-wash-jade text-ink",
      )}
    >
      {children}
    </div>
  );
}

export const PASSWORD_HINT = "Ít nhất 8 ký tự, có cả chữ và số.";
