import { ChevronLeft } from "lucide-react";
import Link from "next/link";

export function BackLink({ href, label }: { href: string; label: string }) {
  return (
    <Link
      href={href}
      className="-ml-2 mb-3 inline-flex min-h-11 items-center gap-1 rounded-btn px-2 text-sm text-ink-soft hover:text-ink"
    >
      <ChevronLeft className="size-4" aria-hidden />
      {label}
    </Link>
  );
}
