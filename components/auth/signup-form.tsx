"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Shake } from "@/components/fx/shake";
import { haptic } from "@/lib/haptics";
import { signUpWithPassword } from "@/lib/actions/auth";
import { displayNameSchema, emailSchema, passwordSchema } from "@/lib/validation";
import { useAuthBin } from "./auth-bin";
import { authErrorMessage, EmailField, FormAlert, loadSupabase, NameField, PasswordField, PasswordStrength } from "./auth-shared";
import { SubmitButton } from "./auth-shared";

type Fields = { display_name?: string; email?: string; password?: string };

const WIN_MS = 500;

/** Name + email + password. The account is created already confirmed, then signed in right away. */
export function SignupForm({ next }: { next: string }) {
  const router = useRouter();
  const bin = useAuthBin();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [touched, setTouched] = useState({ name: false, email: false, password: false });
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [shake, setShake] = useState(0);
  const [fieldErrors, setFieldErrors] = useState<Fields>({});

  const nameOk = touched.name && displayNameSchema.safeParse(name).success;
  const emailOk = touched.email && emailSchema.safeParse(email).success;
  const passwordOk = passwordSchema.safeParse(password).success;

  function checkName() {
    if (!name) return;
    setTouched((t) => ({ ...t, name: true }));
    setFieldErrors((f) => ({ ...f, display_name: displayNameSchema.safeParse(name).error?.issues[0].message }));
  }
  function checkEmail() {
    if (!email) return;
    const r = emailSchema.safeParse(email);
    setTouched((t) => ({ ...t, email: true }));
    setFieldErrors((f) => ({ ...f, email: r.error?.issues[0].message }));
    bin?.emailChecked(r.success);
  }
  function fail(message: string, fields?: Fields) {
    setBusy(false);
    if (fields) setFieldErrors(fields);
    setError(message);
    setShake((n) => n + 1);
    haptic("error");
    bin?.status("error");
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const n = displayNameSchema.safeParse(name);
    const addr = emailSchema.safeParse(email);
    const pass = passwordSchema.safeParse(password);
    setTouched({ name: true, email: true, password: true });
    setFieldErrors({
      display_name: n.error?.issues[0].message,
      email: addr.error?.issues[0].message,
      password: pass.error?.issues[0].message,
    });
    if (!n.success || !addr.success || !pass.success) {
      setShake((s) => s + 1);
      return;
    }

    setBusy(true);
    const res = await signUpWithPassword({ display_name: n.data, email: addr.data, password: pass.data });
    if (!res.ok) return fail(res.error, res.fieldErrors ?? {});
    const { error } = await (await loadSupabase()).auth.signInWithPassword({ email: addr.data, password: pass.data });
    if (error) return fail(authErrorMessage(error));

    setBusy(false);
    setDone(true);
    haptic("success");
    bin?.status("success");
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    setTimeout(
      () => {
        router.replace(`/welcome?next=${encodeURIComponent(next)}`);
        router.refresh();
      },
      reduced ? 0 : WIN_MS,
    );
  }

  const clear = (key: keyof Fields) => fieldErrors[key] && setFieldErrors((f) => ({ ...f, [key]: undefined }));

  return (
    <Shake trigger={shake}>
      <form onSubmit={submit} className="mt-6 space-y-5" noValidate>
        <NameField
          value={name}
          onChange={(v) => {
            setName(v);
            clear("display_name");
          }}
          onBlur={checkName}
          error={fieldErrors.display_name}
          valid={nameOk}
        />
        <EmailField
          value={email}
          onChange={(v) => {
            setEmail(v);
            setTouched((t) => ({ ...t, email: false }));
            clear("email");
          }}
          onBlur={checkEmail}
          error={fieldErrors.email}
          valid={emailOk}
        />
        <PasswordField
          value={password}
          onChange={(v) => {
            setPassword(v);
            clear("password");
          }}
          autoComplete="new-password"
          error={fieldErrors.password}
          valid={passwordOk}
        >
          <PasswordStrength password={password} />
        </PasswordField>
        {error && <FormAlert>{error}</FormAlert>}
        <SubmitButton busy={busy} done={done} busyLabel="Đang tạo tài khoản…">
          Tạo tài khoản
        </SubmitButton>
      </form>
    </Shake>
  );
}
