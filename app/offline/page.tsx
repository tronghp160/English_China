import type { Metadata } from "next";
import { Logo } from "@/components/brand/logo";
import { InkFigure } from "@/components/ui/empty-state";
import { RetryButton } from "./retry-button";

export const metadata: Metadata = { title: "Không có mạng" };

/** Shown by the service worker (public/sw.js) when a page can't load offline. Static, no session. */
export default function OfflinePage() {
  return (
    <div className="mx-auto flex w-full max-w-md flex-1 flex-col px-4 pb-16">
      <header className="flex h-16 items-center">
        <Logo />
      </header>
      <main className="mt-6 flex flex-col items-start">
        <InkFigure name="notebook" size={72} />
        <h1 className="mt-4 text-xl">Bạn đang offline</h1>
        <p className="mt-2 text-ink-soft">
          Trang này cần mạng để tải. Nếu đang ôn dở, kết quả đã lưu trên máy và sẽ tự gửi khi có mạng lại.
        </p>
        <RetryButton />
      </main>
    </div>
  );
}
