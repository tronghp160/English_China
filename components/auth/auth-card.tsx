import Link from "next/link";
import { Logo } from "@/components/brand/logo";

// Floating word stickers on the hero side (decorative).
const STICKERS = [
  { text: "hello 👋", cls: "top-[16%] left-[8%] -rotate-6" },
  { text: "你好", cls: "top-[27%] right-[10%] rotate-6 font-hanzi-sans", delay: "0.6s" },
  { text: "resilient 🌱", cls: "top-[39%] left-[14%] rotate-3", delay: "1.2s" },
  { text: "谢谢 🙏", cls: "top-[50%] right-[12%] -rotate-3 font-hanzi-sans", delay: "0.3s" },
  { text: "adventure 🧭", cls: "top-[60%] left-[20%] -rotate-2", delay: "0.9s" },
];

/** Shared frame of the sign-in / sign-up / password pages: colorful hero on desktop, card with the form. */
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
      <aside className="hero-gradient relative hidden w-[44%] max-w-xl flex-col justify-between overflow-hidden p-10 lg:flex">
        <Link href="/" className="self-start rounded-btn" aria-label="Sổ Từ — trang giới thiệu">
          <Logo className="text-white" />
        </Link>
        <div aria-hidden className="absolute inset-0">
          {STICKERS.map((s) => (
            <span
              key={s.text}
              className={`absolute rounded-2xl bg-white/95 px-4 py-2 text-lg font-bold text-brand shadow-pop ${s.cls}`}
            >
              <span className="block animate-float" style={{ animationDelay: s.delay }}>
                {s.text}
              </span>
            </span>
          ))}
        </div>
        <div className="relative">
          <p className="font-heading text-3xl leading-tight font-black">
            Học từ vựng
            <br />
            vui như chơi game.
          </p>
          <p className="mt-2 max-w-sm text-white/85">Ôn đúng lúc sắp quên, giữ chuỗi ngày, đua XP cùng bạn bè.</p>
        </div>
      </aside>

      <main className="flex flex-1 flex-col items-center px-4 py-6">
        <div className="w-full max-w-md">
          <Link href="/" className="inline-flex rounded-btn lg:hidden" aria-label="Sổ Từ — trang giới thiệu">
            <Logo />
          </Link>
          <div className="notebook-card mt-8 px-6 py-8 sm:px-8 lg:mt-16">
            <h1 className="text-xl text-ink">{title}</h1>
            {subtitle && <p className="mt-1 text-ink-soft">{subtitle}</p>}
            {alert && (
              <p role="alert" className="mt-4 rounded-btn bg-wash-red px-3 py-2 text-sm text-danger">
                {alert}
              </p>
            )}
            {children}
          </div>
          {footer && <p className="mt-6 text-center text-ink-soft">{footer}</p>}
        </div>
      </main>
    </div>
  );
}

export function FooterLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link href={href} className="inline-flex min-h-11 items-center font-bold text-ink-blue underline-offset-4 hover:underline">
      {children}
    </Link>
  );
}
