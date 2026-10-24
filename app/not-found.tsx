import Link from "next/link";
import { Logo } from "@/components/brand/logo";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";

export const metadata = { title: "Không tìm thấy trang" };

export default function NotFound() {
  return (
    <div className="mx-auto flex w-full max-w-md flex-1 flex-col px-4 pb-16">
      <header className="flex h-16 items-center">
        <Logo />
      </header>
      <main className="flex flex-1 flex-col justify-center">
        <EmptyState
          figure="grid"
          title="Không tìm thấy trang này."
          actions={
            <Button asChild size="lg">
              <Link href="/today">Về trang Hôm nay</Link>
            </Button>
          }
        >
          Link có thể đã cũ, hoặc bộ từ hay từ này đã bị xóa.
        </EmptyState>
      </main>
    </div>
  );
}
