import { Plus } from "lucide-react";
import Link from "next/link";

/** Floating "＋ Thêm từ" button (bottom-right, above the tab bar on phones). */
export function AddWordFab({ href, label = "Thêm từ" }: { href: string; label?: string }) {
  return (
    <Link
      href={href}
      className="fixed right-4 bottom-[calc(5rem+env(safe-area-inset-bottom))] z-30 inline-flex h-14 items-center gap-2 rounded-full bg-primary px-5 font-medium text-primary-foreground shadow-[0_6px_20px_-6px_rgb(47_91_211/0.55)] lg:right-8 lg:bottom-8"
    >
      <Plus className="size-5" aria-hidden />
      {label}
    </Link>
  );
}
