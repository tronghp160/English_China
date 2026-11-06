import Link from "next/link";
import { redirect } from "next/navigation";
import { BottomNav, SideNav } from "@/components/app-shell/app-nav";
import { UserMenu } from "@/components/app-shell/user-menu";
import { Logo } from "@/components/brand/logo";
import { MeProvider } from "@/components/app-shell/me-provider";
import { PresenceBeacon } from "@/components/presence/presence-beacon";
import { BinHomeProvider } from "@/components/mascot/bin-home-provider";
import { TutorWidget } from "@/components/tutor/tutor-widget";
import { QuickSearch } from "@/components/app-shell/quick-search";
import { ThemeSwitch } from "@/components/app-shell/theme-switch";
import { TopBar } from "@/components/app-shell/top-bar";
import { isAdmin } from "@/lib/admin";
import { requireMe } from "@/lib/auth";
import { cloneAvailable } from "@/lib/clone/access";
import { getStudySummary } from "@/lib/data/study";
import { aiProvider, cloneConfig } from "@/lib/env";
import { cjkFontVariables } from "@/lib/fonts";
import { readPrefs } from "@/lib/validation";

export default async function AppLayout({ children }: LayoutProps<"/">) {
  const me = await requireMe();
  if (!me.settings.onboarded) redirect("/welcome");
  // The access check runs beside the other reads (and shares the admin lookup), so it adds no wait.
  const [summary, admin, cloneOn] = await Promise.all([getStudySummary(), isAdmin(), cloneAvailable()]);
  const dueCount = summary.langs.reduce((n, l) => n + l.due, 0);

  return (
    <MeProvider
      value={{
        userId: me.user.id,
        displayName: me.profile.display_name,
        username: me.profile.username,
        studyLangs: me.settings.study_langs,
        prefs: readPrefs(me.settings.prefs),
        dueCount,
        // Only for accounts allowed to use it (admins and those an admin switched it on for); null hides every entry point.
        cloneName: cloneOn ? (cloneConfig()?.name ?? null) : null,
      }}
    >
      <PresenceBeacon />
      <BinHomeProvider>
      <SideNav />
      <div className={`${cjkFontVariables} relative flex min-h-dvh flex-1 flex-col lg:pl-62`}>
        <TopBar>
          <div className="mx-auto flex h-16 max-w-6xl items-center gap-2 px-4 lg:px-8">
            {/* The logo lives in the sidebar on desktop; the search field takes the left edge there */}
            <Link href="/today" className="mr-auto inline-flex min-h-10 items-center rounded-md lg:hidden" aria-label="Sổ Từ — Hôm nay">
              <Logo />
            </Link>
            <QuickSearch />
            <ThemeSwitch />
            <UserMenu
              displayName={me.profile.display_name}
              username={me.profile.username}
              avatarUrl={me.profile.avatar_url}
              isAdmin={admin}
            />
          </div>
        </TopBar>
        <main className="mx-auto w-full max-w-6xl flex-1 px-4 pt-4 pb-32 lg:px-8 lg:pb-12">{children}</main>
      </div>
      <BottomNav />
      <TutorWidget aiEnabled={aiProvider() !== null} />
      </BinHomeProvider>
    </MeProvider>
  );
}
