import type { Metadata } from "next";
import { requireMe } from "@/lib/auth";

export const metadata: Metadata = { title: "Hôm nay" };

export default async function TodayPage() {
  const me = await requireMe();
  return (
    <div>
      <h1 className="text-xl font-bold text-ink">Chào {me.profile.display_name}</h1>
      <p className="mt-2 text-ink-soft">Trang Hôm nay sẽ được hoàn thiện ở Phase 4.</p>
    </div>
  );
}
