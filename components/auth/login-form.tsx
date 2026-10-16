"use client";

import { Loader2, Mail } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

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

/** supabase-js is ~65 KB gzip: load it when the user submits, not with the page. */
async function loadSupabase() {
  const { createClient } = await import("@/lib/supabase/client");
  return createClient();
}

export function LoginForm({ next }: { next: string }) {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "google" | "sending" | "sent">("idle");
  const [error, setError] = useState<string | null>(null);

  const callbackUrl = () =>
    `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}`;

  async function signInWithGoogle() {
    setError(null);
    setStatus("google");
    const { error } = await (await loadSupabase()).auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: callbackUrl() },
    });
    if (error) {
      setStatus("idle");
      setError("Không mở được đăng nhập Google. Thử lại hoặc dùng email.");
    }
  }

  async function sendMagicLink(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!/^\S+@\S+\.\S+$/.test(email)) {
      setError("Email chưa đúng định dạng, ví dụ: ban@gmail.com");
      return;
    }
    setStatus("sending");
    const { error } = await (await loadSupabase()).auth.signInWithOtp({
      email: email.trim(),
      options: { emailRedirectTo: callbackUrl() },
    });
    if (error) {
      setStatus("idle");
      setError(
        error.status === 429
          ? "Bạn vừa yêu cầu link. Đợi một phút rồi gửi lại."
          : "Không gửi được email. Kiểm tra địa chỉ rồi thử lại.",
      );
      return;
    }
    setStatus("sent");
  }

  if (status === "sent") {
    return (
      <div className="mt-6 rounded-[10px] bg-wash-jade px-4 py-4 text-sm text-ink" role="status">
        <p className="font-medium">Đã gửi link đăng nhập tới {email}.</p>
        <p className="mt-1 text-ink-soft">Mở email trên thiết bị này và bấm vào link. Không thấy thì xem thư mục Spam.</p>
        <button
          type="button"
          className="mt-3 min-h-11 text-sm font-medium text-ink-blue underline-offset-4 hover:underline"
          onClick={() => setStatus("idle")}
        >
          Dùng email khác
        </button>
      </div>
    );
  }

  return (
    <div className="mt-6 space-y-6">
      <Button
        type="button"
        variant="outline"
        className="h-12 w-full gap-3 rounded-[10px] text-base"
        onClick={signInWithGoogle}
        disabled={status !== "idle"}
      >
        {status === "google" ? <Loader2 className="size-5 animate-spin" aria-hidden /> : <GoogleIcon />}
        Tiếp tục với Google
      </Button>

      <div className="flex items-center gap-3 text-sm text-ink-soft">
        <span className="h-px flex-1 bg-rule" />
        hoặc nhận link qua email
        <span className="h-px flex-1 bg-rule" />
      </div>

      <form onSubmit={sendMagicLink} className="space-y-3" noValidate>
        <div className="space-y-1.5">
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            type="email"
            inputMode="email"
            autoComplete="email"
            placeholder="ban@gmail.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="h-12 rounded-[10px] text-base"
            aria-invalid={Boolean(error) || undefined}
            aria-describedby={error ? "login-error" : undefined}
          />
        </div>
        {error && (
          <p id="login-error" role="alert" className="text-sm text-danger">
            {error}
          </p>
        )}
        <Button type="submit" className="h-12 w-full gap-2 rounded-[10px] text-base" disabled={status !== "idle"}>
          {status === "sending" ? <Loader2 className="size-5 animate-spin" aria-hidden /> : <Mail className="size-5" aria-hidden />}
          Gửi link đăng nhập
        </Button>
      </form>
    </div>
  );
}
