import type { Metadata } from "next";
import { AuthCard, FooterLink } from "@/components/auth/auth-card";
import { ForgotPasswordForm } from "@/components/auth/forgot-password-form";

export const metadata: Metadata = { title: "Quên mật khẩu" };

export default async function ForgotPasswordPage({ searchParams }: PageProps<"/forgot-password">) {
  const params = await searchParams;
  const email = typeof params.email === "string" ? params.email.slice(0, 254) : "";

  return (
    <AuthCard
      title="Quên mật khẩu"
      subtitle="Nhập email đã đăng ký, Sổ Từ sẽ gửi link để bạn đặt mật khẩu mới."
      footer={
        <>
          Nhớ ra rồi? <FooterLink href="/login">Đăng nhập</FooterLink>
        </>
      }
    >
      <ForgotPasswordForm initialEmail={email} />
    </AuthCard>
  );
}
