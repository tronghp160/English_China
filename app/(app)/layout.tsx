import Link from "next/link";
import { redirect } from "next/navigation";
import { BottomNav, SideNav } from "@/components/app-shell/app-nav";
import { UserMenu } from "@/components/app-shell/user-menu";
import { Logo } from "@/components/brand/logo";
import { MeProvider } from "@/components/app-shell/me-provider";
import { requireMe } from "@/lib/auth";
import { cjkFontVariables } from "@/lib/fonts";
import { readPrefs } from "@/lib/validation";

export default async function AppLayout({ children }: LayoutProps<"/">) {
  const me = await requireMe();
  if (!me.settings.onboarded) redirect("/welcome");

  return (
    <MeProvider
      value={{
        userId: me.user.id,
        displayName: me.profile.display_name,
        username: me.profile.username,
        studyLangs: me.settings.study_langs,
        prefs: readPrefs(me.settings.prefs),
      }}
    >
      <SideNav />
      <div className={`${cjkFontVariables} flex min-h-dvh flex-1 flex-col lg:pl-60`}>
        <header className="sticky top-0 z-30 border-b border-rule bg-paper/90 backdrop-blur">
          <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4 lg:px-10">
            <Link href="/today" className="rounded-btn lg:invisible" aria-label="Sổ Từ — Hôm nay">
              <Logo />
            </Link>
            <UserMenu
              displayName={me.profile.display_name}
              username={me.profile.username}
              avatarUrl={me.profile.avatar_url}
            />
          </div>
        </header>
        <main className="mx-auto w-full max-w-6xl flex-1 px-4 pt-5 pb-28 lg:px-10 lg:pb-12">{children}</main>
      </div>
      <BottomNav />
    </MeProvider>
  );
}
