"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Pup } from "@/components/mascot/pup";
import { EmptyState } from "@/components/ui/empty-state";

/** Something threw while a page of the app rendered: say so and offer a retry. */
export default function AppError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <EmptyState
      className="py-20"
      figure={<Pup mood="sad" size={104} className="self-center" />}
      title="Có lỗi khi tải trang."
      actions={
        <>
          <Button type="button" variant="pressable" size="lg" onClick={reset}>
            Thử lại
          </Button>
          <Button asChild size="lg" variant="outline">
            <Link href="/today">Về trang Hôm nay</Link>
          </Button>
        </>
      }
    >
      Kiểm tra mạng rồi thử lại. Nếu vẫn lỗi, nhắn cho mình ở mục Liên hệ.
    </EmptyState>
  );
}
