import { ExternalLink } from "lucide-react";
import { CONTACT, formatPhone, zaloUrl } from "@/lib/contact";
import { cn } from "@/lib/utils";

function FacebookIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden className={className} fill="currentColor">
      <path d="M13.5 21.95V14h2.66l.4-3.1H13.5V8.92c0-.9.25-1.5 1.54-1.5h1.64V4.65A22 22 0 0 0 14.29 4.5c-2.37 0-3.99 1.45-3.99 4.1v2.3H7.62V14h2.68v7.95a10 10 0 1 1 3.2 0Z" />
    </svg>
  );
}

function ZaloIcon({ className }: { className?: string }) {
  return (
    <span aria-hidden className={cn("grid place-items-center rounded-lg bg-sky-text text-[0.6rem] font-black tracking-tight text-surface", className)}>
      Zalo
    </span>
  );
}

/** Facebook + Zalo buttons. Open in a new tab; `compact` is the one-line footer variant. */
export function ContactLinks({ compact = false, className }: { compact?: boolean; className?: string }) {
  const phone = formatPhone(CONTACT.zaloPhone);
  const items = [
    {
      href: CONTACT.facebook,
      label: "Facebook",
      detail: "Nhắn tin qua Messenger",
      icon: <FacebookIcon className="size-7 text-ink-blue" />,
      tone: "bg-wash-blue",
    },
    {
      href: zaloUrl(CONTACT.zaloPhone),
      label: "Zalo",
      detail: phone,
      icon: <ZaloIcon className="size-7" />,
      tone: "bg-wash-sky",
    },
  ];

  return (
    <ul className={cn(compact ? "flex flex-wrap gap-2" : "grid gap-3 sm:grid-cols-2", className)}>
      {items.map((it) => (
        <li key={it.label}>
          <a
            href={it.href}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={`${it.label}: ${it.detail} (mở trong tab mới)`}
            className={cn(
              "flex items-center gap-3 rounded-card border border-rule transition-transform hover:-translate-y-0.5",
              compact ? "min-h-11 bg-surface px-3 py-1.5 text-sm" : cn("min-h-16 px-4 py-3", it.tone),
            )}
          >
            {it.icon}
            <span className="min-w-0 flex-1">
              <span className="block font-bold text-ink">{it.label}</span>
              {!compact && <span className="block truncate text-sm text-ink-soft">{it.detail}</span>}
            </span>
            {!compact && <ExternalLink className="size-4 shrink-0 text-ink-soft" aria-hidden />}
          </a>
        </li>
      ))}
    </ul>
  );
}
