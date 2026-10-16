"use client";

import { Loader2, Mail } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { emailSchema } from "@/lib/validation";
import {
  authErrorMessage,
  callbackUrl,
  EmailField,
  FormAlert,
  GoogleButton,
  loadSupabase,
  OrDivider,
  PasswordField,
} from "./auth-shared";

type Status = "idle" | "busy" | "link-sent" | "confirm-sent";

export function LoginForm({ next }: { next: string }) {
  const router = useRouter();
  const [mode, setMode] = useState<"password" | "link">("password");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [status, setStatus] = useState<Status>("idle");
  const [error, setError] = useState<string | null>(null);
  const [unconfirmed, setUnconfirmed] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<{ email?: string; password?: string }>({});

  function checkEmail() {
    const parsed = emailSchema.safeParse(email);
    if (!parsed.success) {
      setFieldErrors({ email: parsed.error.issues[0].message });
      return null;
    }
    return parsed.data;
  }

  async function signInWithPassword(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setUnconfirmed(false);
    setFieldErrors({});
    const addr = checkEmail();
    if (!addr) return;
    if (!password) return setFieldErrors({ password: "Nhập mật khẩu" });
    setStatus("busy");
    const { error } = await (await loadSupabase()).auth.signInWithPassword({ email: addr, password });
    if (error) {
      setStatus("idle");
      setUnconfirmed(error.code === "email_not_confirmed");
      return setError(authErrorMessage(error));
    }
    router.replace(next);
    router.refresh();
  }

  async function sendMagicLink(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setFieldErrors({});
    const addr = checkEmail();
    if (!addr) return;
    setStatus("busy");
    const { error } = await (await loadSupabase()).auth.signInWithOtp({
      email: addr,
      options: { emailRedirectTo: callbackUrl(next) },
    });
    if (error) {
      setStatus("idle");
      return setError(authErrorMessage(error));
    }
    setStatus("link-sent");
  }

  async function resendConfirmation() {
    const addr = checkEmail();
    if (!addr) return;
    setStatus("busy");
    const { error } = await (await loadSupabase()).auth.resend({
      type: "signup",
      email: addr,
      options: { emailRedirectTo: callbackUrl(next) },
    });
    if (error) {
      setStatus("idle");
      return setError(authErrorMessage(error));
    }
    setError(null);
    setUnconfirmed(false);
    setStatus("confirm-sent");
  }

  if (status === "link-sent" || status === "confirm-sent") {
    return (
      <div className="mt-6">
        <FormAlert tone="success">
          <p className="font-medium">
            {status === "link-sent" ? `Đã gửi link đăng nhập tới ${email.trim()}.` : `Đã gửi lại email xác nhận tới ${email.trim()}.`}
          </p>
          <p className="mt-1 text-ink-soft">Mở email trên thiết bị này và bấm vào link. Không thấy thì xem thư mục Spam.</p>
        </FormAlert>
        <button
          type="button"
          className="mt-3 min-h-11 text-sm font-medium text-ink-blue underline-offset-4 hover:underline"
          onClick={() => setStatus("idle")}
        >
          Quay lại
        </button>
      </div>
    );
  }

  const busy = status === "busy";
  return (
    <div className="mt-6 space-y-6">
      <GoogleButton next={next} disabled={busy} onError={setError} />
      <OrDivider>{mode === "password" ? "hoặc dùng email" : "hoặc nhận link qua email"}</OrDivider>

      <form onSubmit={mode === "password" ? signInWithPassword : sendMagicLink} className="space-y-4" noValidate>
        <EmailField value={email} onChange={setEmail} error={fieldErrors.email} />
        {mode === "password" && (
          <PasswordField
            value={password}
            onChange={setPassword}
            autoComplete="current-password"
            error={fieldErrors.password}
            labelAction={
              <Link
                href={`/forgot-password${email ? `?email=${encodeURIComponent(email.trim())}` : ""}`}
                className="inline-flex min-h-11 items-center text-sm font-medium text-ink-blue underline-offset-4 hover:underline"
              >
                Quên mật khẩu?
              </Link>
            }
          />
        )}
        {error && (
          <FormAlert>
            <p>{error}</p>
            {unconfirmed && (
              <button
                type="button"
                onClick={resendConfirmation}
                className="mt-2 min-h-11 font-medium text-ink-blue underline-offset-4 hover:underline"
              >
                Gửi lại email xác nhận
              </button>
            )}
          </FormAlert>
        )}
        <Button type="submit" className="h-12 w-full gap-2 rounded-[10px] text-base" disabled={busy}>
          {busy ? (
            <Loader2 className="size-5 animate-spin" aria-hidden />
          ) : (
            mode === "link" && <Mail className="size-5" aria-hidden />
          )}
          {mode === "password" ? "Đăng nhập" : "Gửi link đăng nhập"}
        </Button>
      </form>

      <button
        type="button"
        onClick={() => {
          setMode(mode === "password" ? "link" : "password");
          setError(null);
          setFieldErrors({});
        }}
        className="min-h-11 w-full text-sm font-medium text-ink-blue underline-offset-4 hover:underline"
      >
        {mode === "password" ? "Đăng nhập không cần mật khẩu (nhận link qua email)" : "Đăng nhập bằng mật khẩu"}
      </button>
    </div>
  );
}
