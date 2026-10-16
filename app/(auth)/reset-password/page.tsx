import type { Metadata } from "next";
import { AuthCard, FooterLink } from "@/components/auth/auth-card";
import { NewPasswordForm } from "@/components/auth/new-password-form";
import { getUser } from "@/lib/auth";

export const metadata: Metadata = { title: "Đặt mật khẩu mới" };

/** Landing page of the reset link: /auth/callback signs the user in, then sends them here. */
export default async function ResetPasswordPage() {
  const user = await getUser();

  if (!user) {
    return (
      <AuthCard
        title="Link đã hết hạn"
        subtitle="Link đặt lại mật khẩu chỉ dùng được một lần và trong thời gian ngắn."
        footer={<FooterLink href="/login">Về trang đăng nhập</FooterLink>}
      >
        <FooterLink href="/forgot-password">Gửi link mới</FooterLink>
      </AuthCard>
    );
  }

  return (
    <AuthCard title="Đặt mật khẩu mới" subtitle={user.email ? `Cho tài khoản ${user.email}` : undefined}>
      <NewPasswordForm redirectTo="/today" className="mt-6" />
    </AuthCard>
  );
}
