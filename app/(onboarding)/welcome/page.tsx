import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Logo } from "@/components/brand/logo";
import { WelcomeForm } from "@/components/auth/welcome-form";
import { requireMe } from "@/lib/auth";
import { safeNext } from "@/lib/safe-next";

export const metadata: Metadata = { title: "Chào mừng" };

export default async function WelcomePage({ searchParams }: PageProps<"/welcome">) {
  const params = await searchParams;
  // e.g. an invite or share link opened before signing up
  const next = safeNext(typeof params.next === "string" ? params.next : null);
  const me = await requireMe();
  if (me.settings.onboarded) redirect(next);

  return (
    <main className="mx-auto flex w-full max-w-[420px] flex-1 flex-col px-4 py-6">
      <Logo />
      <WelcomeForm initialName={me.profile.display_name} initialUsername={me.profile.username} next={next} />
    </main>
  );
}
