import type { Metadata } from "next";
import { AudioLines, Bell, Download, GraduationCap, KeyRound, MessageSquareHeart, PawPrint, Palette, Smartphone, Trash2, User, Volume2, type LucideIcon } from "lucide-react";
import { IconTile } from "@/components/ui/icon-tile";
import type { Tone } from "@/lib/tone";
import { SettingsForm } from "@/components/settings/settings-form";
import { SettingsNav } from "@/components/settings/settings-nav";
import { VoiceSettings } from "@/components/settings/voice-settings";
import { StudyPrefs } from "@/components/settings/study-prefs";
import { MascotPrefs } from "@/components/settings/mascot-prefs";
import { SoundPrefs } from "@/components/settings/sound-prefs";
import { AvatarUpload } from "@/components/settings/avatar-upload";
import { DeleteAccount, ExportData } from "@/components/settings/account-data";
import { ContactLinks } from "@/components/contact/contact-links";
import { CONTACT } from "@/lib/contact";
import { InstallApp } from "@/components/settings/install-app";
import { ReminderSettings } from "@/components/settings/reminder-settings";
import { NewPasswordForm } from "@/components/auth/new-password-form";
import { ThemeToggle } from "@/components/theme-toggle";
import { requireMe } from "@/lib/auth";
import { getProgress } from "@/lib/data/progress";
import { vapidPublicKey } from "@/lib/push";
import { readPrefs } from "@/lib/validation";

export const metadata: Metadata = { title: "Cài đặt" };

const SECTIONS = [
  { id: "ho-so", label: "Hồ sơ" },
  { id: "mat-khau", label: "Mật khẩu" },
  { id: "on-tap", label: "Ôn tập" },
  { id: "linh-vat", label: "Linh vật" },
  { id: "am-thanh", label: "Âm thanh & rung" },
  { id: "thong-bao", label: "Thông báo" },
  { id: "phat-am", label: "Phát âm" },
  { id: "giao-dien", label: "Giao diện" },
  { id: "ung-dung", label: "Ứng dụng" },
  { id: "lien-he", label: "Liên hệ & góp ý" },
  { id: "du-lieu", label: "Dữ liệu" },
  { id: "xoa-tai-khoan", label: "Xóa tài khoản" },
] as const;

const LOOK: Record<(typeof SECTIONS)[number]["id"], { icon: LucideIcon; tone: Tone }> = {
  "ho-so": { icon: User, tone: "blue" },
  "mat-khau": { icon: KeyRound, tone: "teal" },
  "on-tap": { icon: GraduationCap, tone: "mint" },
  "linh-vat": { icon: PawPrint, tone: "sun" },
  "am-thanh": { icon: AudioLines, tone: "pink" },
  "thong-bao": { icon: Bell, tone: "orange" },
  "phat-am": { icon: Volume2, tone: "coral" },
  "giao-dien": { icon: Palette, tone: "grape" },
  "ung-dung": { icon: Smartphone, tone: "blue" },
  "lien-he": { icon: MessageSquareHeart, tone: "pink" },
  "du-lieu": { icon: Download, tone: "blue" },
  "xoa-tai-khoan": { icon: Trash2, tone: "red" },
};

/** One group of settings as a card with a colored icon tile (REDESIGN_V2 §6.15). */
function Section({ id, title, children, danger }: { id: (typeof SECTIONS)[number]["id"]; title: string; children: React.ReactNode; danger?: boolean }) {
  const { icon, tone } = LOOK[id];
  return (
    <section
      id={id}
      aria-labelledby={`${id}-title`}
      className={`scroll-mt-20 rounded-lg border bg-surface p-5 shadow-sm sm:p-6 ${danger ? "border-danger/50" : "border-border/60 dark:border-border"}`}
    >
      <div className="mb-4 flex items-center gap-3">
        <IconTile icon={icon} tone={tone} size={32} />
        <h2 id={`${id}-title`} className="text-lg">
          {title}
        </h2>
      </div>
      {children}
    </section>
  );
}

export default async function SettingsPage() {
  const me = await requireMe();
  const prefs = readPrefs(me.settings.prefs);
  const progress = await getProgress();

  return (
    <div>
      <h1 className="mb-6 text-[1.6875rem] sm:text-[2.125rem]">Cài đặt</h1>
      <div className="lg:grid lg:grid-cols-[11rem_minmax(0,1fr)] lg:gap-12">
        <SettingsNav items={[...SECTIONS]} />
        <div className="flex max-w-2xl flex-col gap-4">
          <Section id="ho-so" title="Hồ sơ">
            <AvatarUpload userId={me.user.id} displayName={me.profile.display_name} avatarUrl={me.profile.avatar_url} />
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
          <Section id="mat-khau" title="Mật khẩu">
            <p className="mb-4 text-sm text-fg-muted">
              Đặt hoặc đổi mật khẩu để đăng nhập bằng email
              {me.user.email && (
                <>
                  {" "}
                  <span className="text-fg">{me.user.email}</span>
                </>
              )}
              .
            </p>
            <NewPasswordForm />
          </Section>
          <Section id="on-tap" title="Ôn tập">
            <StudyPrefs prefs={prefs} />
          </Section>
          <Section id="linh-vat" title="Linh vật">
            <MascotPrefs prefs={prefs} unlockedOutfits={progress.outfits} />
          </Section>
          <Section id="am-thanh" title="Âm thanh & rung">
            <SoundPrefs prefs={prefs} />
          </Section>
          <Section id="thong-bao" title="Thông báo">
            <ReminderSettings publicKey={vapidPublicKey()} />
          </Section>
          <Section id="phat-am" title="Phát âm">
            <VoiceSettings prefs={prefs} />
          </Section>
          <Section id="giao-dien" title="Giao diện">
            <ThemeToggle />
          </Section>
          <Section id="ung-dung" title="Ứng dụng">
            <InstallApp />
          </Section>
          <Section id="lien-he" title="Liên hệ & góp ý">
            <p className="mb-3 text-sm text-fg-muted">Gặp lỗi hay muốn góp ý? Nhắn trực tiếp cho {CONTACT.nickname}, người làm Sổ Từ.</p>
            <ContactLinks />
          </Section>
          <Section id="du-lieu" title="Dữ liệu của bạn">
            <ExportData />
          </Section>
          <Section id="xoa-tai-khoan" title="Xóa tài khoản" danger>
            <DeleteAccount username={me.profile.username} />
          </Section>
        </div>
      </div>
    </div>
  );
}
