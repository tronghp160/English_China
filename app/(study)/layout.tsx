import { redirect } from "next/navigation";
import { MeProvider } from "@/components/app-shell/me-provider";
import { requireMe } from "@/lib/auth";
import { readPrefs } from "@/lib/validation";

/** Full-screen focus layout for review and practice sessions (no navigation chrome). */
export default async function StudyLayout({ children }: LayoutProps<"/">) {
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
      <main className="mx-auto flex min-h-dvh w-full max-w-2xl flex-1 flex-col px-4 pt-3 pb-4">
        {children}
      </main>
    </MeProvider>
  );
}
