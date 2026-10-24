import Link from "next/link";
import { AlertCircle } from "lucide-react";
import { Logo } from "@/components/brand/logo";
import { Pup } from "@/components/mascot/pup";

// Words floating still on the blue panel beside the form (REDESIGN_V2 §6.14), each a small chip.
// The Chinese word is the one glyph pair of the 2-glyph font subset the auth pages can use.
const WORDS = [
  { text: "hello", cls: "left-[8%] top-[14%] -rotate-3" },
  { text: "坚强", cls: "right-[10%] top-[24%] rotate-2 font-hanzi-sans font-bold" },
  { text: "resilient", cls: "left-[14%] top-[44%] rotate-1" },
  { text: "thank you", cls: "right-[8%] top-[60%] -rotate-2" },
];

/**
 * Shared frame of the sign-in / sign-up / password pages. On wide screens the left half is a blue panel
 * with Bin and a few word chips; the form sits bare on the right, 380px wide. On phones: logo, Bin, form.
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
      <aside className="relative m-3 hidden w-[44%] max-w-xl flex-col justify-between overflow-hidden rounded-xl bg-primary p-8 text-on-primary lg:flex" aria-hidden>
        <Link href="/" className="self-start rounded-md" tabIndex={-1}>
          <Logo inverse />
        </Link>
        {WORDS.map((w) => (
          <span
            key={w.text}
            lang={w.text === "坚强" ? "zh-CN" : "en"}
            className={`absolute rounded-full bg-white/16 px-4 py-2 text-xl font-bold ${w.cls}`}
          >
            {w.text}
          </span>
        ))}
        <div className="relative mt-auto flex items-end justify-between gap-4">
          <p className="max-w-[16ch] font-display text-[2.25rem] leading-[1.1]">Mỗi ngày ôn đúng những từ sắp quên.</p>
          <Pup mood="wave" size={150} className="shrink-0" />
        </div>
      </aside>

      <main className="flex flex-1 flex-col items-center justify-center px-4 py-8">
        <div className="w-full max-w-[380px]">
          <div className="flex items-center justify-between lg:hidden">
            <Link href="/" className="inline-flex rounded-md" aria-label="Sổ Từ, trang giới thiệu">
              <Logo />
            </Link>
            <Pup mood="wave" size={56} />
          </div>
          <h1 className="mt-6 text-[1.75rem] lg:mt-0">{title}</h1>
          {subtitle && <p className="mt-1 text-fg-muted">{subtitle}</p>}
          {alert && (
            <p role="alert" className="mt-4 flex items-start gap-2 rounded-md border-l-[3px] border-danger bg-danger-soft px-3 py-2 text-sm text-danger-fg">
              <AlertCircle className="mt-0.5 size-4 shrink-0" aria-hidden />
              {alert}
            </p>
          )}
          {children}
          {footer && <p className="mt-6 text-fg-muted">{footer}</p>}
        </div>
      </main>
    </div>
  );
}

export function FooterLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link href={href} className="inline-flex min-h-11 items-center font-semibold text-primary-fg underline-offset-4 hover:underline">
      {children}
    </Link>
  );
}
