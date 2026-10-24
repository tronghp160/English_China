"use client";

import { useState } from "react";
import { emailSchema } from "@/lib/validation";
import { useAuthBin } from "./auth-bin";
import { authErrorMessage, callbackUrl, EmailField, FormAlert, loadSupabase, SubmitButton } from "./auth-shared";

export function ForgotPasswordForm({ initialEmail }: { initialEmail: string }) {
  const bin = useAuthBin();
  const [email, setEmail] = useState(initialEmail);
  const [busy, setBusy] = useState(false);
  const [sentTo, setSentTo] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [emailError, setEmailError] = useState<string>();

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const addr = emailSchema.safeParse(email);
    setEmailError(addr.error?.issues[0].message);
    if (!addr.success) return;
    setBusy(true);
    const { error } = await (await loadSupabase()).auth.resetPasswordForEmail(addr.data, {
      redirectTo: callbackUrl("/reset-password"),
    });
    setBusy(false);
    if (error) {
      bin?.status("error");
      return setError(authErrorMessage(error));
    }
    // Same answer whether or not the address has an account (no account enumeration).
    setSentTo(addr.data);
  }

  if (sentTo) {
    return (
      <div className="mt-6">
        <FormAlert tone="success">
          <p className="font-medium">Nếu {sentTo} có tài khoản Sổ Từ, link đặt lại mật khẩu đã được gửi tới đó.</p>
          <p className="mt-1 text-fg-muted">Mở email trên thiết bị này và bấm vào link. Không thấy thì xem thư mục Spam.</p>
        </FormAlert>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="mt-6 space-y-5" noValidate>
      <EmailField value={email} onChange={setEmail} error={emailError} />
      {error && <FormAlert>{error}</FormAlert>}
      <SubmitButton busy={busy} busyLabel="Đang gửi…">
        Gửi link đặt lại mật khẩu
      </SubmitButton>
    </form>
  );
}
