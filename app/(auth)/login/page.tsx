import type { Metadata } from "next";
import { AuthCard, FooterLink } from "@/components/auth/auth-card";
import { LoginForm } from "@/components/auth/login-form";
import { safeNext } from "@/lib/safe-next";

export const metadata: Metadata = { title: "Đăng nhập" };

const ERRORS: Record<string, string> = {
  auth: "Link đã hết hạn hoặc đã được dùng. Hãy thử lại để nhận link mới.",
  config: "Ứng dụng chưa được cấu hình Supabase. Kiểm tra file .env.local.",
};

export default async function LoginPage({ searchParams }: PageProps<"/login">) {
  const params = await searchParams;
  const next = safeNext(typeof params.next === "string" ? params.next : null);
  const error = typeof params.error === "string" ? ERRORS[params.error] ?? ERRORS.auth : null;
  const signupHref = next === "/today" ? "/signup" : `/signup?next=${encodeURIComponent(next)}`;

  return (
    <AuthCard
      title="Chào mừng trở lại!"
      subtitle="Bin nhớ bạn lắm đó."
      alert={error}
      footer={
        <>
          Chưa có tài khoản? <FooterLink href={signupHref}>Tạo sổ miễn phí</FooterLink>
        </>
      }
    >
      <LoginForm next={next} />
    </AuthCard>
  );
}
