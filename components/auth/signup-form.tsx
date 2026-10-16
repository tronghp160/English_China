"use client";

import { Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { emailSchema, passwordSchema } from "@/lib/validation";
import {
  authErrorMessage,
  callbackUrl,
  EmailField,
  FormAlert,
  GoogleButton,
  loadSupabase,
  OrDivider,
  PASSWORD_HINT,
  PasswordField,
} from "./auth-shared";

export function SignupForm({ next }: { next: string }) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [sentTo, setSentTo] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<{ email?: string; password?: string }>({});

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const addr = emailSchema.safeParse(email);
    const pass = passwordSchema.safeParse(password);
    setFieldErrors({ email: addr.error?.issues[0].message, password: pass.error?.issues[0].message });
    if (!addr.success || !pass.success) return;

    setBusy(true);
    const supabase = await loadSupabase();
    const { data, error } = await supabase.auth.signUp({
      email: addr.data,
      password: pass.data,
      // After confirming, the email link lands on onboarding (then `next`).
      options: { emailRedirectTo: callbackUrl(`/welcome?next=${encodeURIComponent(next)}`) },
    });
    if (error) {
      setBusy(false);
      return setError(authErrorMessage(error));
    }
    if (data.session) {
      // Email confirmation is off: signed in already.
      router.replace(`/welcome?next=${encodeURIComponent(next)}`);
      router.refresh();
      return;
    }
    setBusy(false);
    // With confirmation on, Supabase hides whether the address is taken: an existing
    // account comes back as a user without identities and no email is sent.
    if (data.user && data.user.identities?.length === 0) {
      return setError(authErrorMessage({ code: "user_already_exists", status: 422, message: "" }));
    }
    setSentTo(addr.data);
  }

  if (sentTo) {
    return (
      <div className="mt-6">
        <FormAlert tone="success">
          <p className="font-medium">Gần xong! Kiểm tra email {sentTo}.</p>
          <p className="mt-1 text-ink-soft">
            Bấm vào link xác nhận trong email để kích hoạt tài khoản. Không thấy thì xem thư mục Spam.
          </p>
        </FormAlert>
        <button
          type="button"
          className="mt-3 min-h-11 text-sm font-medium text-ink-blue underline-offset-4 hover:underline"
          onClick={() => setSentTo(null)}
        >
          Dùng email khác
        </button>
      </div>
    );
  }

  return (
    <div className="mt-6 space-y-6">
      <GoogleButton next={`/welcome?next=${encodeURIComponent(next)}`} disabled={busy} onError={setError} />
      <OrDivider>hoặc đăng ký bằng email</OrDivider>
      <form onSubmit={submit} className="space-y-4" noValidate>
        <EmailField value={email} onChange={setEmail} error={fieldErrors.email} />
        <PasswordField
          value={password}
          onChange={setPassword}
          autoComplete="new-password"
          error={fieldErrors.password}
          hint={PASSWORD_HINT}
        />
        {error && <FormAlert>{error}</FormAlert>}
        <Button type="submit" className="h-12 w-full gap-2 rounded-[10px] text-base" disabled={busy}>
          {busy && <Loader2 className="size-5 animate-spin" aria-hidden />}
          Tạo tài khoản
        </Button>
      </form>
    </div>
  );
}
