"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Shake } from "@/components/fx/shake";
import { haptic } from "@/lib/haptics";
import { confirmPendingAccount } from "@/lib/actions/auth";
import { emailSchema } from "@/lib/validation";
import { useAuthBin } from "./auth-bin";
import { authErrorMessage, EmailField, FormAlert, loadSupabase, PasswordField, SubmitButton } from "./auth-shared";

/** Bin jumps for a moment before the page changes (none under reduced motion). */
const WIN_MS = 500;

export function LoginForm({ next }: { next: string }) {
  const router = useRouter();
  const bin = useAuthBin();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [shake, setShake] = useState(0);
  const [fieldErrors, setFieldErrors] = useState<{ email?: string; password?: string }>({});
  const [emailOk, setEmailOk] = useState(false);

  function checkEmail() {
    if (!email) return;
    const addr = emailSchema.safeParse(email);
    setEmailOk(addr.success);
    setFieldErrors((f) => ({ ...f, email: addr.error?.issues[0].message }));
    bin?.emailChecked(addr.success);
  }

  function fail(message: string) {
    setBusy(false);
    setError(message);
    setShake((n) => n + 1);
    haptic("error");
    bin?.status("error");
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const addr = emailSchema.safeParse(email);
    const errs = { email: addr.error?.issues[0].message, password: password ? undefined : "Nhập mật khẩu" };
    setFieldErrors(errs);
    setEmailOk(addr.success);
    if (!addr.success || errs.password) {
      setShake((n) => n + 1);
      return;
    }

    setBusy(true);
    const supabase = await loadSupabase();
    const credentials = { email: addr.data, password };
    let { error } = await supabase.auth.signInWithPassword(credentials);
    if (error?.code === "email_not_confirmed") {
      // Made while email confirmation was still on: activate it now, then sign in again.
      const res = await confirmPendingAccount(credentials);
      if (!res.ok) return fail(res.error);
      ({ error } = await supabase.auth.signInWithPassword(credentials));
    }
    if (error) return fail(authErrorMessage(error));

    setBusy(false);
    setDone(true);
    haptic("success");
    bin?.status("success");
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    setTimeout(
      () => {
        router.replace(next);
        router.refresh();
      },
      reduced ? 0 : WIN_MS,
    );
  }

  return (
    <Shake trigger={shake}>
      <form onSubmit={submit} className="mt-6 space-y-5" noValidate>
        <EmailField
          value={email}
          onChange={(v) => {
            setEmail(v);
            setEmailOk(false);
            if (fieldErrors.email) setFieldErrors((f) => ({ ...f, email: undefined }));
          }}
          onBlur={checkEmail}
          error={fieldErrors.email}
          valid={emailOk}
        />
        <PasswordField
          value={password}
          onChange={(v) => {
            setPassword(v);
            if (fieldErrors.password) setFieldErrors((f) => ({ ...f, password: undefined }));
          }}
          autoComplete="current-password"
          error={fieldErrors.password}
          labelAction={
            <Link
              href={`/forgot-password${email ? `?email=${encodeURIComponent(email.trim())}` : ""}`}
              className="inline-flex min-h-11 items-center text-sm font-semibold text-primary-fg underline-offset-4 hover:underline"
            >
              Quên mật khẩu?
            </Link>
          }
        />
        {error && <FormAlert>{error}</FormAlert>}
        <SubmitButton busy={busy} done={done} busyLabel="Đang đăng nhập…">
          Đăng nhập
        </SubmitButton>
      </form>
    </Shake>
  );
}
