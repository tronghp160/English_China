"use client";

import { Loader2 } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { emailSchema } from "@/lib/validation";
import { authErrorMessage, callbackUrl, EmailField, FormAlert, loadSupabase } from "./auth-shared";

export function ForgotPasswordForm({ initialEmail }: { initialEmail: string }) {
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
    if (error) return setError(authErrorMessage(error));
    // Same answer whether or not the address has an account (no account enumeration).
    setSentTo(addr.data);
  }

  if (sentTo) {
    return (
      <div className="mt-6">
        <FormAlert tone="success">
          <p className="font-medium">Nếu {sentTo} có tài khoản Sổ Từ, link đặt lại mật khẩu đã được gửi tới đó.</p>
          <p className="mt-1 text-ink-soft">Mở email trên thiết bị này và bấm vào link. Không thấy thì xem thư mục Spam.</p>
        </FormAlert>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="mt-6 space-y-4" noValidate>
      <EmailField value={email} onChange={setEmail} error={emailError} />
      {error && <FormAlert>{error}</FormAlert>}
      <Button type="submit" size="lg" className="w-full" disabled={busy}>
        {busy && <Loader2 className="animate-spin" aria-hidden />}
        Gửi link đặt lại mật khẩu
      </Button>
    </form>
  );
}
