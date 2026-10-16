import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Logo } from "@/components/brand/logo";
import { WelcomeForm } from "@/components/auth/welcome-form";
import { requireMe } from "@/lib/auth";

export const metadata: Metadata = { title: "Chào mừng" };

export default async function WelcomePage() {
  const me = await requireMe();
  if (me.settings.onboarded) redirect("/today");

  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col px-4 py-6">
      <Logo />
      <WelcomeForm initialName={me.profile.display_name} initialUsername={me.profile.username} />
    </main>
  );
}
