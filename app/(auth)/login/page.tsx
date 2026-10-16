import type { Metadata } from "next";
import Link from "next/link";
import { Logo } from "@/components/brand/logo";
import { LoginForm } from "@/components/auth/login-form";
import { safeNext } from "@/lib/safe-next";

export const metadata: Metadata = { title: "Đăng nhập" };

const ERRORS: Record<string, string> = {
  auth: "Link đăng nhập đã hết hạn hoặc đã được dùng. Hãy gửi lại link mới.",
  config: "Ứng dụng chưa được cấu hình Supabase. Kiểm tra file .env.local.",
};

export default async function LoginPage({ searchParams }: PageProps<"/login">) {
  const params = await searchParams;
  const next = safeNext(typeof params.next === "string" ? params.next : null);
  const error = typeof params.error === "string" ? ERRORS[params.error] ?? ERRORS.auth : null;

  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col px-4 py-6">
      <Link href="/" className="self-start rounded-[10px]" aria-label="Sổ Từ — trang giới thiệu">
        <Logo />
      </Link>
      <div className="notebook-card mt-10 px-6 py-8 sm:px-8">
        <h1 className="text-xl font-bold text-ink">Đăng nhập Sổ Từ</h1>
        <p className="mt-1 text-sm text-ink-soft">Chưa có tài khoản? Đăng nhập lần đầu sẽ tự tạo tài khoản.</p>
        {error && (
          <p role="alert" className="mt-4 rounded-[10px] bg-wash-red px-3 py-2 text-sm text-danger">
            {error}
          </p>
        )}
        <LoginForm next={next} />
      </div>
    </main>
  );
}
