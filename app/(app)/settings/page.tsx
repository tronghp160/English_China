import type { Metadata } from "next";
import { SettingsForm } from "@/components/settings/settings-form";
import { VoiceSettings } from "@/components/settings/voice-settings";
import { StudyPrefs } from "@/components/settings/study-prefs";
import { AvatarUpload } from "@/components/settings/avatar-upload";
import { DeleteAccount, ExportData } from "@/components/settings/account-data";
import { InstallApp } from "@/components/settings/install-app";
import { NewPasswordForm } from "@/components/auth/new-password-form";
import { ThemeToggle } from "@/components/theme-toggle";
import { requireMe } from "@/lib/auth";
import { readPrefs } from "@/lib/validation";

export const metadata: Metadata = { title: "Cài đặt" };

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="border-t border-rule py-6 first:border-t-0 first:pt-0">
      <h2 className="mb-4 text-lg text-ink">{title}</h2>
      {children}
    </section>
  );
}

export default async function SettingsPage() {
  const me = await requireMe();
  const prefs = readPrefs(me.settings.prefs);

  return (
    <div className="mx-auto max-w-xl">
      <h1 className="mb-6 text-xl text-ink">Cài đặt</h1>
      <Section title="Hồ sơ">
        <AvatarUpload
          userId={me.user.id}
          displayName={me.profile.display_name}
          avatarUrl={me.profile.avatar_url}
        />
        <SettingsForm
          initial={{
            display_name: me.profile.display_name,
            username: me.profile.username,
            daily_new_limit: me.settings.daily_new_limit,
            daily_goal: me.settings.daily_goal,
            study_langs: me.settings.study_langs,
          }}
        />
      </Section>
      <Section title="Mật khẩu">
        <p className="mb-4 text-sm text-ink-soft">
          Đặt hoặc đổi mật khẩu để đăng nhập bằng email
          {me.user.email && (
            <>
              {" "}
              <span className="text-ink">{me.user.email}</span>
            </>
          )}
          , kể cả khi bạn đang dùng Google.
        </p>
        <NewPasswordForm />
      </Section>
      <Section title="Ôn tập">
        <StudyPrefs prefs={prefs} />
      </Section>
      <Section title="Phát âm">
        <VoiceSettings prefs={prefs} />
      </Section>
      <Section title="Giao diện">
        <ThemeToggle />
      </Section>
      <Section title="Ứng dụng">
        <InstallApp />
      </Section>
      <Section title="Dữ liệu của bạn">
        <ExportData />
      </Section>
      <Section title="Xóa tài khoản">
        <DeleteAccount username={me.profile.username} />
      </Section>
    </div>
  );
}
