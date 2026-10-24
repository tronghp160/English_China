import Link from "next/link";
import { AlertCircle } from "lucide-react";
import { Logo } from "@/components/brand/logo";

// Words written on the notebook page beside the form: each sits on its own ruled line.
// The Chinese word is the one glyph pair of the 2-glyph font subset auth pages can use.
const WORDS = [
  { text: "hello", cls: "font-display text-ink" },
  { text: "resilient", cls: "font-display text-ink-soft" },
  { text: "坚强", cls: "font-hanzi text-ink" },
  { text: "adventure", cls: "font-display text-ink-soft" },
  { text: "thank you", cls: "font-display text-ink" },
];

/**
 * Shared frame of the sign-in / sign-up / password pages. On wide screens the left 44% is a still
 * notebook page with a few words on its lines; the form sits bare on the right, 380px wide.
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
    <div className="flex flex-1">
      <aside className="ruled-paper margin-line hidden w-[44%] max-w-xl flex-col justify-between border-r border-rule bg-surface py-8 pr-10 pl-[calc(var(--margin-x)+2rem)] [--margin-x:56px] lg:flex" aria-hidden>
        <Link href="/" className="self-start rounded-btn" tabIndex={-1}>
          <Logo />
        </Link>
        <div>
          {WORDS.map((w) => (
            <p key={w.text} lang={w.text === "坚强" ? "zh-CN" : "en"} className={`flex h-[calc(var(--line)*3)] items-end text-[2.5rem] leading-none ${w.cls}`}>
              {w.text}
            </p>
          ))}
        </div>
        <p className="flex h-[calc(var(--line)*2)] items-end text-ink-soft">Mỗi ngày ôn đúng những từ sắp quên.</p>
      </aside>

      <main className="flex flex-1 flex-col items-center justify-center px-4 py-8">
        <div className="w-full max-w-[380px]">
          <Link href="/" className="inline-flex rounded-btn lg:hidden" aria-label="Sổ Từ, trang giới thiệu">
            <Logo />
          </Link>
          <h1 className="mt-8 text-xl lg:mt-0">{title}</h1>
          {subtitle && <p className="mt-1 text-ink-soft">{subtitle}</p>}
          {alert && (
            <p role="alert" className="mt-4 flex items-start gap-2 rounded-btn border-l-[3px] border-seal bg-tint-seal px-3 py-2 text-sm text-seal-text">
              <AlertCircle className="mt-0.5 size-4 shrink-0" aria-hidden />
              {alert}
            </p>
          )}
          {children}
          {footer && <p className="mt-6 text-ink-soft">{footer}</p>}
        </div>
      </main>
    </div>
  );
}

export function FooterLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link href={href} className="inline-flex min-h-11 items-center font-semibold text-ink-violet underline-offset-4 hover:underline">
      {children}
    </Link>
  );
}
