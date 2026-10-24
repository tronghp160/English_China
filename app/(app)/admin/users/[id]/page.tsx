import { ArrowLeft, BookOpen, Bot, CalendarDays, Flame, MessageCircle, Sparkles, Target, Trophy, type LucideIcon } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { AdminAction } from "@/components/admin/admin-actions";
import { UserAvatar } from "@/components/app-shell/user-menu";
import { LangMark } from "@/components/lang-mark";
import { Badge } from "@/components/ui/badge";
import { IconTile } from "@/components/ui/icon-tile";
import { deleteUserAccount, setUserBanned } from "@/lib/actions/admin";
import { requireAdmin } from "@/lib/admin";
import { getAdminUserDetail } from "@/lib/data/admin";
import type { PracticeMode } from "@/lib/lang/registry";
import { MODE_INFO } from "@/lib/practice/questions";
import type { Tone } from "@/lib/tone";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Người dùng · Quản trị", robots: { index: false } };

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const RATING: Record<number, { label: string; tone: Tone }> = {
  1: { label: "Quên", tone: "red" },
  2: { label: "Khó", tone: "orange" },
  3: { label: "Nhớ", tone: "blue" },
  4: { label: "Dễ", tone: "mint" },
};
const VISIBILITY: Record<string, string> = { private: "Riêng tư", group: "Nhóm", public: "Công khai", link: "Có link" };

const dateTime = (iso: string | null, withTime = false) =>
  iso
    ? new Intl.DateTimeFormat("vi-VN", { timeZone: "Asia/Ho_Chi_Minh", dateStyle: "short", ...(withTime ? { timeStyle: "short" } : {}) }).format(new Date(iso))
    : "chưa";

function Figure({ icon, tone, value, label }: { icon: LucideIcon; tone: Tone; value: string; label: string }) {
  return (
    <div className="flex items-center gap-3 rounded-lg bg-surface p-4 shadow-sm dark:border dark:border-border">
      <IconTile icon={icon} tone={tone} size={40} />
      <div className="min-w-0">
        <p className="font-display text-xl leading-none font-extrabold tabular-nums">{value}</p>
        <p className="mt-1 text-sm text-fg-muted">{label}</p>
      </div>
    </div>
  );
}

function Section({ title, children, className }: { title: string; children: React.ReactNode; className?: string }) {
  return (
    <section className={cn("rounded-lg bg-surface p-4 shadow-sm sm:p-5 dark:border dark:border-border", className)}>
      <h2 className="mb-3 text-lg">{title}</h2>
      {children}
    </section>
  );
}

export default async function AdminUserPage({ params }: PageProps<"/admin/users/[id]">) {
  const me = await requireAdmin();
  const { id } = await params;
  if (!UUID.test(id)) notFound();
  const u = await getAdminUserDetail(id);
  if (!u) notFound();

  const s = u.study;
  const accuracy = s.reviews ? Math.round((s.correct / s.reviews) * 100) : 0;
  const maxDay = Math.max(1, ...s.last30.map((d) => d.reviews));
  const self = u.id === me.id;

  return (
    <div className="flex max-w-4xl flex-col gap-5">
      <Link href="/admin?tab=users" className="inline-flex min-h-10 w-fit items-center gap-1.5 rounded-md text-sm font-semibold text-fg-muted hover:text-fg">
        <ArrowLeft className="size-4" aria-hidden />
        Người dùng
      </Link>

      <header className="flex flex-col gap-4 rounded-xl bg-surface p-5 shadow-sm sm:flex-row sm:items-center dark:border dark:border-border">
        <UserAvatar name={u.displayName} url={u.avatarUrl} seed={u.username || u.id} className="size-16" />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-1.5">
            <h1 className="text-[1.5rem] leading-tight">{u.displayName}</h1>
            {u.admin && (
              <Badge variant="soft" tone="grape">
                Quản trị
              </Badge>
            )}
            {u.banned && (
              <Badge variant="soft" tone="red">
                Đã khóa
              </Badge>
            )}
          </div>
          {u.username && <p className="text-fg-muted">@{u.username}</p>}
          <p className="truncate">{u.email}</p>
          <p className="text-sm text-fg-muted">
            Tạo {dateTime(u.createdAt)} · Đăng nhập gần nhất {dateTime(u.lastSignInAt, true)} · Học gần nhất {s.lastActiveDay ?? "chưa"}
          </p>
        </div>
        {!self && !u.admin && (
          <div className="flex shrink-0 flex-wrap gap-2">
            <AdminAction
              label={u.banned ? "Mở khóa" : "Khóa"}
              run={setUserBanned.bind(null, { userId: u.id, banned: !u.banned })}
              done={u.banned ? "Đã mở khóa tài khoản." : "Đã khóa tài khoản."}
              confirm={
                u.banned
                  ? undefined
                  : { title: `Khóa tài khoản ${u.email}?`, text: "Người này không đăng nhập được nữa cho tới khi bạn mở khóa. Dữ liệu vẫn giữ nguyên.", action: "Khóa tài khoản" }
              }
            />
            <AdminAction
              label="Xóa"
              destructive
              run={deleteUserAccount.bind(null, { userId: u.id })}
              done="Đã xóa tài khoản."
              confirm={{ title: `Xóa hẳn tài khoản ${u.email}?`, text: "Xóa tài khoản, ảnh, bộ từ, tiến độ ôn và các nhóm người này làm chủ. Không hoàn tác được.", action: "Xóa tài khoản" }}
            />
          </div>
        )}
      </header>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Figure icon={Trophy} tone="grape" value={`Cấp ${s.level}`} label={`${s.totalXp} XP`} />
        <Figure icon={BookOpen} tone="blue" value={String(s.reviews)} label={`Lượt ôn · đúng ${accuracy}%`} />
        <Figure icon={Flame} tone="sun" value={`${s.streak} ngày`} label={`Chuỗi hiện tại · dài nhất ${s.longestStreak}`} />
        <Figure icon={CalendarDays} tone="mint" value={String(s.activeDays)} label="Ngày có học" />
        <Figure icon={Sparkles} tone="coral" value={String(s.wordsAdded)} label="Từ đã thêm" />
        <Figure icon={Target} tone="teal" value={String(u.cards.review)} label={`Thẻ đã nhớ · ${u.cards.learning + u.cards.relearning} đang tập`} />
        <Figure icon={Bot} tone="orange" value={`${u.ai.today} / ${u.ai.last7}`} label="Lượt AI hôm nay / 7 ngày" />
        <Figure icon={MessageCircle} tone="pink" value={String(u.chat.threads)} label={`Cuộc trò chuyện gia sư · ${u.chat.messages} tin`} />
      </div>

      <Section title="Lượt ôn 30 ngày qua">
        <div role="img" aria-label={`Lượt ôn mỗi ngày trong 30 ngày, nhiều nhất ${maxDay}`} className="flex h-28 items-end gap-[3px]">
          {s.last30.map((d) => (
            <span
              key={d.day}
              title={`${d.day}: ${d.reviews} lượt`}
              className={cn("min-h-[3px] flex-1 rounded-t-[3px]", d.reviews ? "bg-primary" : "bg-surface-3")}
              style={{ height: `${Math.max(3, (d.reviews / maxDay) * 100)}%` }}
            />
          ))}
        </div>
        <div className="mt-1.5 flex justify-between text-sm text-fg-muted tabular-nums">
          <span>{s.last30[0].day}</span>
          <span>hôm nay</span>
        </div>
      </Section>

      <div className="grid gap-5 lg:grid-cols-2">
        <Section title={`Bộ từ (${u.decks.length})`}>
          {u.decks.length ? (
            <ul className="flex flex-col gap-2">
              {u.decks.map((d) => (
                <li key={d.id} className="flex items-center gap-2.5">
                  <LangMark lang={d.language} />
                  <Link href={`/decks/${d.id}`} className="min-w-0 flex-1 truncate font-semibold hover:underline">
                    {d.name}
                  </Link>
                  <span className="shrink-0 text-sm text-fg-muted tabular-nums">
                    {d.words} từ · {VISIBILITY[d.visibility] ?? d.visibility}
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-fg-muted">Chưa tạo bộ từ nào.</p>
          )}
          <p className="mt-3 text-sm text-fg-muted">Đang theo học {u.subscriptions} bộ từ của người khác.</p>
        </Section>

        <Section title="Cài đặt & nhóm">
          {u.settings ? (
            <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1.5 text-[0.9375rem]">
              <dt className="text-fg-muted">Ngôn ngữ học</dt>
              <dd>{u.settings.studyLangs.map((l) => (l === "zh" ? "Tiếng Trung" : "Tiếng Anh")).join(", ")}</dd>
              <dt className="text-fg-muted">Mục tiêu ngày</dt>
              <dd className="tabular-nums">{u.settings.dailyGoal} lượt</dd>
              <dt className="text-fg-muted">Từ mới mỗi ngày</dt>
              <dd className="tabular-nums">{u.settings.dailyNewLimit}</dd>
              <dt className="text-fg-muted">Múi giờ</dt>
              <dd>{u.settings.timezone}</dd>
              <dt className="text-fg-muted">Xong chào mừng</dt>
              <dd>{u.settings.onboarded ? "Rồi" : "Chưa"}</dd>
              <dt className="text-fg-muted">Thẻ</dt>
              <dd className="tabular-nums">
                {u.cards.new} mới · {u.cards.suspended} tạm ẩn
              </dd>
            </dl>
          ) : (
            <p className="text-fg-muted">Chưa có cài đặt.</p>
          )}
          <h3 className="mt-4 mb-1.5 font-bold">Nhóm</h3>
          {u.groups.length ? (
            <ul className="flex flex-col gap-1">
              {u.groups.map((g) => (
                <li key={g.id}>
                  {g.name} <span className="text-sm text-fg-muted">({g.role === "owner" ? "chủ nhóm" : "thành viên"})</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-fg-muted">Không ở nhóm nào.</p>
          )}
        </Section>
      </div>

      <Section title="Lượt ôn gần nhất">
        {u.recentReviews.length ? (
          <ul className="divide-y divide-border">
            {u.recentReviews.map((r, i) => {
              const rating = RATING[r.rating];
              return (
                <li key={i} className="flex items-center gap-3 py-2">
                  <span className="min-w-0 flex-1 truncate font-semibold">{r.term}</span>
                  <span className="shrink-0 text-sm text-fg-muted">{MODE_INFO[r.mode as PracticeMode]?.label ?? r.mode}</span>
                  {rating && (
                    <Badge variant="soft" tone={rating.tone} className="shrink-0">
                      {rating.label}
                    </Badge>
                  )}
                  <span className="hidden shrink-0 text-sm text-fg-muted tabular-nums sm:block">{dateTime(r.at, true)}</span>
                </li>
              );
            })}
          </ul>
        ) : (
          <p className="text-fg-muted">Chưa ôn lần nào.</p>
        )}
      </Section>

      <p className="text-sm text-fg-muted">
        Nội dung trò chuyện với gia sư và ghi chú riêng của người dùng không hiện ở đây để giữ riêng tư; trang này chỉ cho thấy số liệu.
      </p>
    </div>
  );
}
