import Link from "next/link";
import { redirect } from "next/navigation";
import { BottomNav, SideNav } from "@/components/app-shell/app-nav";
import { UserMenu } from "@/components/app-shell/user-menu";
import { Logo } from "@/components/brand/logo";
import { MeProvider } from "@/components/app-shell/me-provider";
import { QuickSearch } from "@/components/app-shell/quick-search";
import { ThemeSwitch } from "@/components/app-shell/theme-switch";
import { TopBar } from "@/components/app-shell/top-bar";
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
      <div className={`${cjkFontVariables} relative flex min-h-dvh flex-1 flex-col lg:pl-58`}>
        <TopBar>
          <div className="mx-auto flex h-14 max-w-6xl items-center gap-1 px-4 lg:px-10">
            {/* The logo lives in the sidebar on desktop; the search field takes the left edge there */}
            <Link href="/today" className="mr-auto rounded-btn lg:hidden" aria-label="Sổ Từ — Hôm nay">
              <Logo />
            </Link>
            <QuickSearch />
            <ThemeSwitch />
            <UserMenu
              displayName={me.profile.display_name}
              username={me.profile.username}
              avatarUrl={me.profile.avatar_url}
            />
          </div>
        </TopBar>
        <main className="mx-auto w-full max-w-6xl flex-1 px-4 pt-5 pb-28 lg:px-10 lg:pb-12">{children}</main>
      </div>
      <BottomNav />
    </MeProvider>
  );
}
