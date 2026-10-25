import { ExternalLink } from "lucide-react";
import { CONTACT, formatPhone, zaloUrl } from "@/lib/contact";
import { cn } from "@/lib/utils";

export function FacebookIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden className={className} fill="currentColor">
      <path d="M13.5 21.95V14h2.66l.4-3.1H13.5V8.92c0-.9.25-1.5 1.54-1.5h1.64V4.65A22 22 0 0 0 14.29 4.5c-2.37 0-3.99 1.45-3.99 4.1v2.3H7.62V14h2.68v7.95a10 10 0 1 1 3.2 0Z" />
    </svg>
  );
}

/** Zalo as a one-color outlined mark next to the Facebook glyph. */
export function ZaloIcon({ className }: { className?: string }) {
  return (
    // The word is CSS content so it is not read or matched as a second "Zalo" next to the link's own text.
    <span
      aria-hidden
      className={cn(
        "grid place-items-center rounded-sm border-[1.5px] border-current text-[0.5625rem] leading-none font-bold tracking-tight before:content-['Zalo']",
        className,
      )}
    />
  );
}

/** Facebook + Zalo buttons. Open in a new tab; `compact` is the one-line variant. */
export function ContactLinks({ compact = false, className }: { compact?: boolean; className?: string }) {
  const phone = formatPhone(CONTACT.zaloPhone);
  const items = [
    {
      href: CONTACT.facebook,
      label: "Facebook",
      detail: "Nhắn tin qua Messenger",
      tint: "bg-c-blue-soft text-c-blue-fg",
      hover: "hover:border-c-blue-soft hover:bg-c-blue-soft/30 hover:text-c-blue-fg",
      icon: <FacebookIcon className={compact ? "size-4" : "size-5"} />,
    },
    {
      href: zaloUrl(CONTACT.zaloPhone),
      label: "Zalo",
      detail: phone,
      tint: "bg-c-teal-soft text-c-teal-fg",
      hover: "hover:border-c-teal-soft hover:bg-c-teal-soft/30 hover:text-c-teal-fg",
      icon: <ZaloIcon className={compact ? "h-3.5 w-5" : "h-5 w-7"} />,
    },
  ];

  return (
    <ul className={cn(compact ? "flex flex-wrap items-center gap-2 shrink-0" : "grid gap-3 sm:grid-cols-2", className)}>
      {items.map((it) => (
        <li key={it.label}>
          <a
            href={it.href}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={`${it.label}: ${it.detail} (mở trong tab mới)`}
            className={cn(
              "flex items-center text-fg transition-all active:translate-y-0",
              compact
                ? cn(
                    "min-h-10 gap-2.5 rounded-full border border-border/70 bg-surface px-3.5 py-1.5 text-xs font-semibold shadow-xs hover:-translate-y-0.5 hover:shadow-sm dark:border-border",
                    it.hover,
                  )
                : "min-h-16 gap-3 rounded-xl border border-border/60 bg-surface px-4 py-3 shadow-sm hover:-translate-y-0.5 hover:shadow-md dark:border-border",
            )}
          >
            <span
              className={cn(
                "grid shrink-0 place-items-center",
                it.tint,
                compact ? "size-7 rounded-full" : "size-10 rounded-md",
              )}
            >
              {it.icon}
            </span>
            <span className="min-w-0 flex-1">
              <span className="flex items-center gap-1 font-semibold">
                {it.label}
                {compact && <ExternalLink className="size-3 opacity-60" aria-hidden />}
              </span>
              {!compact && <span className="block truncate text-sm text-fg-muted">{it.detail}</span>}
            </span>
            {!compact && <ExternalLink className="size-4 shrink-0 text-fg-muted" aria-hidden />}
          </a>
        </li>
      ))}
    </ul>
  );
}
