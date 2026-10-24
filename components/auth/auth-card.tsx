import Link from "next/link";
import { AlertCircle } from "lucide-react";

/**
 * The heading, the optional notice, the form and the footer line of an auth page. The frame around it (blue panel,
 * tabs, Bin) is `AuthShell` in app/(auth)/layout.tsx.
 */
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
    <div>
      <h1 className="mt-6 text-[1.75rem] leading-tight lg:text-[1.875rem]">{title}</h1>
      {subtitle && <p className="mt-1 text-[1.0625rem] text-fg-muted">{subtitle}</p>}
      {alert && (
        <p role="alert" className="mt-4 flex items-start gap-2 rounded-md border-l-[3px] border-danger bg-danger-soft px-3 py-2 text-sm text-danger-fg">
          <AlertCircle className="mt-0.5 size-4 shrink-0" aria-hidden />
          {alert}
        </p>
      )}
      {children}
      {footer && <p className="mt-6 text-center text-[0.9375rem] text-fg-muted">{footer}</p>}
    </div>
  );
}

export function FooterLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link href={href} className="inline-flex min-h-11 items-center font-bold text-primary-fg underline-offset-4 hover:underline">
      {children}
    </Link>
  );
}
