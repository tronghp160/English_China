import Link from "next/link";
import { Logo } from "@/components/brand/logo";

/** Shared frame of the sign-in / sign-up / password pages. */
export function AuthCard({
  title,
  subtitle,
  alert,
  footer,
  children,
}: {
  title: string;
  subtitle?: React.ReactNode;
  alert?: string | null;
  footer?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col px-4 py-6">
      <Link href="/" className="self-start rounded-[10px]" aria-label="Sổ Từ — trang giới thiệu">
        <Logo />
      </Link>
      <div className="notebook-card mt-10 px-6 py-8 sm:px-8">
        <h1 className="text-xl font-bold text-ink">{title}</h1>
        {subtitle && <p className="mt-1 text-sm text-ink-soft">{subtitle}</p>}
        {alert && (
          <p role="alert" className="mt-4 rounded-[10px] bg-wash-red px-3 py-2 text-sm text-danger">
            {alert}
          </p>
        )}
        {children}
      </div>
      {footer && <p className="mt-6 text-center text-sm text-ink-soft">{footer}</p>}
    </main>
  );
}

export function FooterLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link href={href} className="inline-flex min-h-11 items-center font-medium text-ink-blue underline-offset-4 hover:underline">
      {children}
    </Link>
  );
}
