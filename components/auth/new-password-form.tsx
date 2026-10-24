"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { passwordSchema } from "@/lib/validation";
import { authErrorMessage, FormAlert, loadSupabase, PASSWORD_HINT, PasswordField, PasswordStrength, SubmitButton } from "./auth-shared";

/**
 * Sets the signed-in user's password: after a reset link (/reset-password) or
 * from Settings (also lets Google / email-link users add a password).
 */
export function NewPasswordForm({ redirectTo, className }: { redirectTo?: string; className?: string }) {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<{ password?: string; confirm?: string }>({});

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const pass = passwordSchema.safeParse(password);
    const errs = {
      password: pass.error?.issues[0].message,
      confirm: pass.success && confirm !== password ? "Hai mật khẩu chưa khớp" : undefined,
    };
    setFieldErrors(errs);
    if (errs.password || errs.confirm) return;
    setBusy(true);
    const { error } = await (await loadSupabase()).auth.updateUser({ password });
    setBusy(false);
    if (error) return setError(authErrorMessage(error));
    toast.success("Đã lưu mật khẩu mới");
    setPassword("");
    setConfirm("");
    if (redirectTo) {
      router.replace(redirectTo);
      router.refresh();
    }
  }

  return (
    <form onSubmit={submit} className={cn("space-y-5", className)} noValidate>
      <PasswordField
        id="new-password"
        label="Mật khẩu mới"
        value={password}
        onChange={setPassword}
        autoComplete="new-password"
        error={fieldErrors.password}
        hint={PASSWORD_HINT}
      >
        {password && <PasswordStrength password={password} />}
      </PasswordField>
      <PasswordField
        id="confirm-password"
        label="Nhập lại mật khẩu mới"
        value={confirm}
        onChange={setConfirm}
        autoComplete="new-password"
        error={fieldErrors.confirm}
      />
      {error && <FormAlert>{error}</FormAlert>}
      <SubmitButton busy={busy} busyLabel="Đang lưu…">
        Lưu mật khẩu
      </SubmitButton>
    </form>
  );
}
