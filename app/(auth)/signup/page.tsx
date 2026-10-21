import type { Metadata } from "next";
import { AuthCard, FooterLink } from "@/components/auth/auth-card";
import { SignupForm } from "@/components/auth/signup-form";
import { safeNext } from "@/lib/safe-next";

export const metadata: Metadata = { title: "Đăng ký" };

export default async function SignupPage({ searchParams }: PageProps<"/signup">) {
  const params = await searchParams;
  const next = safeNext(typeof params.next === "string" ? params.next : null);
  const loginHref = next === "/today" ? "/login" : `/login?next=${encodeURIComponent(next)}`;

  return (
    <AuthCard
      title="Tạo tài khoản miễn phí ✨"
      subtitle="Chỉ mất 30 giây. Ghi và ôn từ vựng tiếng Anh, tiếng Trung cùng bạn bè."
      footer={
        <>
          Đã có tài khoản? <FooterLink href={loginHref}>Đăng nhập</FooterLink>
        </>
      }
    >
      <SignupForm next={next} />
    </AuthCard>
  );
}
