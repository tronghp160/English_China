"use client";

import { Loader2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { confirmPendingAccount } from "@/lib/actions/auth";
import { emailSchema } from "@/lib/validation";
import { authErrorMessage, EmailField, FormAlert, loadSupabase, PasswordField } from "./auth-shared";

export function LoginForm({ next }: { next: string }) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<{ email?: string; password?: string }>({});

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const addr = emailSchema.safeParse(email);
    const errs = { email: addr.error?.issues[0].message, password: password ? undefined : "Nhập mật khẩu" };
    setFieldErrors(errs);
    if (!addr.success || errs.password) return;

    setBusy(true);
    const supabase = await loadSupabase();
    const credentials = { email: addr.data, password };
    let { error } = await supabase.auth.signInWithPassword(credentials);
    if (error?.code === "email_not_confirmed") {
      // Made while email confirmation was still on: activate it now, then sign in again.
      const res = await confirmPendingAccount(credentials);
      if (!res.ok) {
        setBusy(false);
        return setError(res.error);
      }
      ({ error } = await supabase.auth.signInWithPassword(credentials));
    }
    if (error) {
      setBusy(false);
      return setError(authErrorMessage(error));
    }
    router.replace(next);
    router.refresh();
  }

  return (
    <form onSubmit={submit} className="mt-6 space-y-4" noValidate>
      <EmailField value={email} onChange={setEmail} error={fieldErrors.email} />
      <PasswordField
        value={password}
        onChange={setPassword}
        autoComplete="current-password"
        error={fieldErrors.password}
        labelAction={
          <Link
            href={`/forgot-password${email ? `?email=${encodeURIComponent(email.trim())}` : ""}`}
            className="inline-flex min-h-11 items-center text-sm font-semibold text-ink-blue underline-offset-4 hover:underline"
          >
            Quên mật khẩu?
          </Link>
        }
      />
      {error && <FormAlert>{error}</FormAlert>}
      <Button type="submit" className="h-13 w-full gap-2 text-lg font-extrabold" disabled={busy}>
        {busy && <Loader2 className="size-5 animate-spin" aria-hidden />}
        Đăng nhập
      </Button>
    </form>
  );
}
