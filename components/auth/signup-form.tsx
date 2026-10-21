"use client";

import { Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { signUpWithPassword } from "@/lib/actions/auth";
import { displayNameSchema, emailSchema, passwordSchema } from "@/lib/validation";
import { authErrorMessage, EmailField, FormAlert, loadSupabase, PASSWORD_HINT, PasswordField } from "./auth-shared";

type Fields = { display_name?: string; email?: string; password?: string };

/** Name + email + password. The account is created already confirmed, then signed in right away. */
export function SignupForm({ next }: { next: string }) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Fields>({});

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const n = displayNameSchema.safeParse(name);
    const addr = emailSchema.safeParse(email);
    const pass = passwordSchema.safeParse(password);
    setFieldErrors({
      display_name: n.error?.issues[0].message,
      email: addr.error?.issues[0].message,
      password: pass.error?.issues[0].message,
    });
    if (!n.success || !addr.success || !pass.success) return;

    setBusy(true);
    const res = await signUpWithPassword({ display_name: n.data, email: addr.data, password: pass.data });
    if (!res.ok) {
      setBusy(false);
      setFieldErrors(res.fieldErrors ?? {});
      return setError(res.error);
    }
    const { error } = await (await loadSupabase()).auth.signInWithPassword({ email: addr.data, password: pass.data });
    if (error) {
      setBusy(false);
      return setError(authErrorMessage(error));
    }
    router.replace(`/welcome?next=${encodeURIComponent(next)}`);
    router.refresh();
  }

  return (
    <form onSubmit={submit} className="mt-6 space-y-4" noValidate>
      <div className="space-y-1.5">
        <Label htmlFor="display_name">Tên của bạn</Label>
        <Input
          id="display_name"
          autoComplete="name"
          placeholder="Ví dụ: Minh Anh"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="h-12 text-base"
          aria-invalid={Boolean(fieldErrors.display_name) || undefined}
          aria-describedby={fieldErrors.display_name ? "display_name-error" : undefined}
        />
        {fieldErrors.display_name && (
          <p id="display_name-error" className="text-sm text-danger">
            {fieldErrors.display_name}
          </p>
        )}
      </div>
      <EmailField value={email} onChange={setEmail} error={fieldErrors.email} />
      <PasswordField
        value={password}
        onChange={setPassword}
        autoComplete="new-password"
        error={fieldErrors.password}
        hint={PASSWORD_HINT}
      />
      {error && <FormAlert>{error}</FormAlert>}
      <Button type="submit" className="h-13 w-full gap-2 text-lg font-extrabold" disabled={busy}>
        {busy && <Loader2 className="size-5 animate-spin" aria-hidden />}
        Tạo tài khoản
      </Button>
    </form>
  );
}
