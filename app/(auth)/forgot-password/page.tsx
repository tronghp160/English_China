import type { Metadata } from "next";
import { AuthCard } from "@/components/auth/auth-card";
import { ForgotPasswordForm } from "@/components/auth/forgot-password-form";

export const metadata: Metadata = { title: "Quên mật khẩu" };

export default async function ForgotPasswordPage({ searchParams }: PageProps<"/forgot-password">) {
  const params = await searchParams;
  const email = typeof params.email === "string" ? params.email.slice(0, 254) : "";

  return (
    <AuthCard
      title="Quên mật khẩu à? Không sao"
      subtitle="Nhập email đã đăng ký, Sổ Từ sẽ gửi link để bạn đặt mật khẩu mới."
    >
      <ForgotPasswordForm initialEmail={email} />
    </AuthCard>
  );
}
