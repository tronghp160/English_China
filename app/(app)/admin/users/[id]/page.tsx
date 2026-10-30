import {
  ArrowLeft,
  BookOpen,
  Bot,
  CalendarDays,
  Download,
  Flame,
  MapPin,
  MessageCircle,
  Radio,
  Sparkles,
  Target,
  Trophy,
  type LucideIcon,
} from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { AdminAction } from "@/components/admin/admin-actions";
import { AdminChatViewer } from "@/components/admin/admin-chat-viewer";
import { AdminWordTable } from "@/components/admin/admin-word-table";
import { DeviceChip } from "@/components/admin/device-chip";
import { LoginHistory } from "@/components/admin/login-history";
import { OnlineDot } from "@/components/admin/online-dot";
import { PetChip } from "@/components/admin/pet-chip";
import { PetPanel } from "@/components/admin/pet-panel";
import { PlaceLine } from "@/components/admin/place-line";
import { UserNoteForm } from "@/components/admin/user-note-form";
import { UserAvatar } from "@/components/app-shell/user-menu";
import { LangMark } from "@/components/lang-mark";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { IconTile } from "@/components/ui/icon-tile";
import { Input } from "@/components/ui/input";
import { SegmentedNav } from "@/components/ui/segmented";
import { deleteUserAccount, setUserBanned } from "@/lib/actions/admin";
import { ago, dateTime } from "@/lib/admin-format";
import { requireAdmin } from "@/lib/admin";
import { getUserNote, logAdminAction } from "@/lib/data/admin-audit";
import {
  getAdminUserDetail,
  getUserAccount,
  getUserChat,
  getUserDailyStats30,
  listUserChats,
  listUserReviews,
  listUserWords,
} from "@/lib/data/admin";
import {
  getPetSummaryFor,
  getPresenceMap,
  getUserLoginHistory,
  type LoginEventRow,
  type PresenceRow,
} from "@/lib/data/admin-monitor";
import type { FlaggedLoginEvent, PlaceSummary } from "@/lib/admin-monitor-utils";
import type { PracticeMode } from "@/lib/lang/registry";
import { MODE_INFO } from "@/lib/practice/questions";
import { describePath, presenceStatus } from "@/lib/presence";
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
const VISIBILITY: Record<string, string> = {
  private: "Riêng tư",
  group: "Nhóm",
  public: "Công khai",
  unlisted: "Có link",
  link: "Có link",
};

const TABS = [
  { value: "overview", label: "Tổng quan" },
  { value: "pet", label: "Thú cưng" },
  { value: "login", label: "Đăng nhập & vị trí" },
  { value: "words", label: "Từ vựng" },
  { value: "decks", label: "Bộ từ" },
  { value: "reviews", label: "Ôn tập" },
  { value: "chat", label: "Gia sư" },
  { value: "account", label: "Tài khoản" },
] as const;
type Tab = (typeof TABS)[number]["value"];

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

export default async function AdminUserPage({
  params,
  searchParams,
}: PageProps<"/admin/users/[id]">) {
  const me = await requireAdmin();
  const [{ id }, sp] = await Promise.all([params, searchParams]);
  if (!UUID.test(id)) notFound();

  const [u, presenceMap, pet, loginHistory, note] = await Promise.all([
    getAdminUserDetail(id),
    getPresenceMap([id]),
    getPetSummaryFor(id),
    getUserLoginHistory(id, 50),
    getUserNote(id),
  ]);
  if (!u) notFound();

  const tab: Tab = TABS.some((t) => t.value === sp.tab) ? (sp.tab as Tab) : "overview";

  if (tab === "login") {
    await logAdminAction({
      admin: me,
      action: "view_login_history",
      target: { userId: id, label: u.displayName },
      dedupeMinutes: 10,
    });
  } else if (tab === "chat") {
    await logAdminAction({
      admin: me,
      action: "view_chat",
      target: { userId: id, label: u.displayName },
      dedupeMinutes: 10,
    });
  }
  const self = u.id === me.id;
  const presence = presenceMap.get(id);
  const pStatus = presenceStatus(presence?.last_seen_at);

  return (
    <div className="flex max-w-4xl flex-col gap-5">
      <Link
        href="/admin?tab=users"
        className="inline-flex min-h-10 w-fit items-center gap-1.5 rounded-md text-sm font-semibold text-fg-muted hover:text-fg"
      >
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
            Tạo {dateTime(u.createdAt)} · Đăng nhập gần nhất {dateTime(u.lastSignInAt, true)} · Học gần nhất{" "}
            {u.study.lastActiveDay ?? "chưa"}
          </p>
          <div className="mt-1.5 flex flex-wrap items-center gap-2">
            <OnlineDot status={pStatus} withLabel />
            <span className="text-xs text-fg-muted">
              · Online gần nhất {ago(presence?.last_seen_at)}
              {pStatus === "online" && ` · ${describePath(presence?.path ?? null)}`}
            </span>
          </div>
          <div className="mt-1">
            <PlaceLine
              city={presence?.city}
              region={presence?.region}
              country={presence?.country}
              ip={presence?.ip}
              latitude={presence?.latitude}
              longitude={presence?.longitude}
              showMap
            />
          </div>
          {pet && (
            <div className="mt-2">
              <PetChip
                level={pet.level.level}
                outfit={pet.outfit}
                outfitName={pet.outfitName}
                streak={pet.streak}
              />
            </div>
          )}
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
                  : {
                      title: `Khóa tài khoản ${u.email}?`,
                      text: "Người này không đăng nhập được nữa cho tới khi bạn mở khóa. Dữ liệu vẫn giữ nguyên.",
                      action: "Khóa tài khoản",
                    }
              }
            />
            <AdminAction
              label="Xóa"
              destructive
              run={deleteUserAccount.bind(null, { userId: u.id })}
              done="Đã xóa tài khoản."
              confirm={{
                title: `Xóa hẳn tài khoản ${u.email}?`,
                text: "Xóa tài khoản, ảnh, bộ từ, tiến độ ôn và các nhóm người này làm chủ. Không hoàn tác được.",
                action: "Xóa tài khoản",
              }}
            />
          </div>
        )}
      </header>

      <SegmentedNav
        label="Mục chi tiết người dùng"
        scroll
        className="mt-1"
        items={TABS.map((t) => ({
          label: t.label,
          href: `/admin/users/${id}?tab=${t.value}`,
          active: t.value === tab,
        }))}
      />

      <div className="mt-2">
        {tab === "overview" && (
          <OverviewTab
            u={u}
            presence={presence}
            placesCount={loginHistory.places.length}
            note={note}
          />
        )}
        {tab === "pet" && <PetPanel pet={pet} />}
        {tab === "login" && <UserLoginTab presence={presence} loginHistory={loginHistory} />}
        {tab === "words" && <UserWordsTab userId={u.id} decks={u.decks} sp={sp} />}
        {tab === "decks" && <UserDecksTab u={u} />}
        {tab === "reviews" && <UserReviewsTab userId={u.id} sp={sp} />}
        {tab === "chat" && <UserChatTab userId={u.id} sp={sp} />}
        {tab === "account" && <UserAccountTab userId={u.id} self={self} isAdmin={u.admin} />}
      </div>
    </div>
  );
}

function OverviewTab({
  u,
  presence,
  placesCount,
  note,
}: {
  u: NonNullable<Awaited<ReturnType<typeof getAdminUserDetail>>>;
  presence?: PresenceRow;
  placesCount: number;
  note: string | null;
}) {
  const s = u.study;
  const accuracy = s.reviews ? Math.round((s.correct / s.reviews) * 100) : 0;
  const maxDay = Math.max(1, ...s.last30.map((d) => d.reviews));

  return (
    <div className="flex flex-col gap-5">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Figure icon={Radio} tone="mint" value={ago(presence?.last_seen_at)} label="Online gần nhất" />
        <Figure icon={MapPin} tone="teal" value={`${placesCount} nơi`} label="Số nơi đăng nhập" />
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
                  <Link href={`/admin/decks/${d.id}`} className="min-w-0 flex-1 truncate font-semibold hover:underline">
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

      <Section title="Ghi chú của quản trị viên">
        <p className="mb-3 text-sm text-fg-muted">
          Chỉ quản trị viên thấy, người dùng không thấy.
        </p>
        <UserNoteForm userId={u.id} initialNote={note} />
      </Section>
    </div>
  );
}

function UserLoginTab({
  presence,
  loginHistory,
}: {
  presence?: PresenceRow;
  loginHistory: {
    events: FlaggedLoginEvent<LoginEventRow>[];
    places: PlaceSummary[];
  };
}) {
  const pStatus = presenceStatus(presence?.last_seen_at);
  const coords =
    presence?.latitude != null && presence?.longitude != null
      ? `${presence.latitude.toFixed(2)}, ${presence.longitude.toFixed(2)}`
      : "Chưa có";

  return (
    <div className="flex flex-col gap-6">
      {/* Current / latest presence */}
      <Section title="Hiện tại / gần nhất">
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <p className="text-xs text-fg-muted">Trạng thái & Lần cuối</p>
            <div className="mt-1 flex items-center gap-2">
              <OnlineDot status={pStatus} withLabel />
              <span className="text-xs text-fg-muted">
                ({dateTime(presence?.last_seen_at, true)})
              </span>
            </div>
            <div className="mt-3">
              <p className="text-xs text-fg-muted">Vị trí ước tính</p>
              <div className="mt-1">
                <PlaceLine
                  city={presence?.city}
                  region={presence?.region}
                  country={presence?.country}
                  ip={presence?.ip}
                  latitude={presence?.latitude}
                  longitude={presence?.longitude}
                  showMap
                />
              </div>
            </div>
          </div>

          <div className="space-y-3 text-sm">
            <div>
              <p className="text-xs text-fg-muted">Thiết bị & Trình duyệt</p>
              <div className="mt-1">
                <DeviceChip
                  deviceType={presence?.device_type}
                  browser={presence?.browser}
                  os={presence?.os}
                  deviceModel={presence?.device_model}
                />
              </div>
            </div>
            <div>
              <p className="text-xs text-fg-muted">Múi giờ</p>
              <p className="mt-0.5 text-fg">{presence?.timezone ?? "Chưa rõ"}</p>
            </div>
            <div>
              <p className="text-xs text-fg-muted">Tọa độ xấp xỉ</p>
              <p className="mt-0.5 font-mono text-xs text-fg">{coords}</p>
            </div>
          </div>
        </div>
      </Section>

      {/* History and places */}
      <LoginHistory events={loginHistory.events} places={loginHistory.places} />

      <p className="text-xs text-fg-muted">
        Ghi nhận từ lúc bật tính năng. Phiên mở từ trước được ghi khi người dùng mở lại ứng dụng.
        Cột &apos;Đăng nhập gần nhất&apos; ở tab Tài khoản là số liệu của Supabase.
      </p>
    </div>
  );
}

async function UserWordsTab({
  userId,
  decks,
  sp,
}: {
  userId: string;
  decks: { id: string; name: string }[];
  sp: Record<string, string | string[] | undefined>;
}) {
  const q = typeof sp.q === "string" ? sp.q.slice(0, 100) : "";
  const deckId = typeof sp.deck === "string" && sp.deck ? sp.deck : undefined;
  const lang = sp.lang === "en" || sp.lang === "zh" ? sp.lang : undefined;
  const status = typeof sp.status === "string" && sp.status ? sp.status : undefined;
  const page = Math.max(1, Number(typeof sp.page === "string" ? sp.page : 1) || 1);

  const { rows, total } = await listUserWords(userId, { q, deckId, lang, status, page });

  const queryParams = new URLSearchParams();
  queryParams.set("tab", "words");
  if (q) queryParams.set("q", q);
  if (deckId) queryParams.set("deck", deckId);
  if (lang) queryParams.set("lang", lang);
  if (status) queryParams.set("status", status);

  return (
    <section aria-label="Từ vựng của người dùng">
      <form action={`/admin/users/${userId}`} className="flex flex-col gap-2 sm:flex-row sm:items-center mb-4">
        <input type="hidden" name="tab" value="words" />
        <div className="flex-1">
          <label htmlFor="user-word-q" className="sr-only">
            Tìm từ vựng
          </label>
          <Input id="user-word-q" name="q" defaultValue={q} placeholder="Tìm theo từ hoặc nghĩa..." />
        </div>
        <div className="w-full sm:w-44">
          <label htmlFor="user-word-deck" className="sr-only">
            Bộ từ
          </label>
          <select
            id="user-word-deck"
            name="deck"
            defaultValue={deckId ?? ""}
            className="w-full h-10 rounded-md border border-input bg-surface px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <option value="">Tất cả bộ từ</option>
            {decks.map((d) => (
              <option key={d.id} value={d.id}>
                {d.name}
              </option>
            ))}
          </select>
        </div>
        <div className="w-full sm:w-36">
          <label htmlFor="user-word-lang" className="sr-only">
            Ngôn ngữ
          </label>
          <select
            id="user-word-lang"
            name="lang"
            defaultValue={lang ?? ""}
            className="w-full h-10 rounded-md border border-input bg-surface px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <option value="">Tất cả ngôn ngữ</option>
            <option value="en">Tiếng Anh</option>
            <option value="zh">Tiếng Trung</option>
          </select>
        </div>
        <div className="w-full sm:w-40">
          <label htmlFor="user-word-status" className="sr-only">
            Trạng thái học
          </label>
          <select
            id="user-word-status"
            name="status"
            defaultValue={status ?? ""}
            className="w-full h-10 rounded-md border border-input bg-surface px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <option value="">Tất cả trạng thái</option>
            <option value="new">Mới</option>
            <option value="learning">Đang học</option>
            <option value="learned">Đã thuộc</option>
            <option value="hard">Hay quên</option>
            <option value="suspended">Tạm ẩn</option>
          </select>
        </div>
        <Button type="submit">Lọc</Button>
      </form>

      <AdminWordTable
        rows={rows}
        total={total}
        page={page}
        baseHref={`/admin/users/${userId}?${queryParams.toString()}`}
        showStatus={true}
        showDeck={true}
        showCreator={false}
      />
    </section>
  );
}

function UserDecksTab({ u }: { u: NonNullable<Awaited<ReturnType<typeof getAdminUserDetail>>> }) {
  return (
    <div className="flex flex-col gap-6">
      <Section title={`Bộ từ sở hữu (${u.decks.length})`}>
        {u.decks.length ? (
          <ul className="flex flex-col gap-2.5">
            {u.decks.map((d) => (
              <li
                key={d.id}
                className="flex flex-col gap-2 rounded-lg bg-surface-2/60 p-4 border border-border sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <LangMark lang={d.language} />
                    <Link href={`/admin/decks/${d.id}`} className="truncate font-bold text-base hover:underline">
                      {d.name}
                    </Link>
                    <Badge variant="soft" tone={d.visibility === "public" ? "teal" : d.visibility === "group" ? "orange" : undefined}>
                      {VISIBILITY[d.visibility] ?? d.visibility}
                    </Badge>
                  </div>
                  <p className="mt-1 text-sm text-fg-muted tabular-nums">
                    {d.words} từ vựng · {d.learners} người học
                  </p>
                </div>
                <div className="shrink-0">
                  <Button asChild size="sm" variant="outline">
                    <Link href={`/admin/decks/${d.id}`}>Xem từ</Link>
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-fg-muted">Chưa tạo bộ từ nào.</p>
        )}
      </Section>

      <Section title="Bộ từ đang theo học">
        <p className="text-sm text-fg-muted">
          Người dùng này đang theo học <strong className="text-fg font-semibold">{u.subscriptions}</strong> bộ từ của người khác.
        </p>
      </Section>

      <Section title={`Nhóm tham gia (${u.groups.length})`}>
        {u.groups.length ? (
          <ul className="flex flex-col gap-2">
            {u.groups.map((g) => (
              <li key={g.id} className="flex items-center justify-between rounded-lg bg-surface-2/60 p-3 border border-border">
                <span className="font-semibold text-fg">{g.name}</span>
                <Badge variant="soft" tone={g.role === "owner" ? "grape" : "blue"}>
                  {g.role === "owner" ? "Chủ nhóm" : "Thành viên"}
                </Badge>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-fg-muted">Không tham gia nhóm nào.</p>
        )}
      </Section>
    </div>
  );
}

async function UserReviewsTab({
  userId,
  sp,
}: {
  userId: string;
  sp: Record<string, string | string[] | undefined>;
}) {
  const mode = typeof sp.mode === "string" && sp.mode ? sp.mode : undefined;
  const [dailyStats, logs] = await Promise.all([
    getUserDailyStats30(userId),
    listUserReviews(userId, mode),
  ]);

  return (
    <div className="flex flex-col gap-6">
      <Section title="Thống kê 30 ngày qua (daily_stats)">
        {dailyStats.length ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-border text-xs font-semibold uppercase text-fg-muted">
                <tr>
                  <th className="py-2.5 pr-4">Ngày</th>
                  <th className="py-2.5 px-4 text-right">Lượt ôn</th>
                  <th className="py-2.5 px-4 text-right">Nhớ đúng</th>
                  <th className="py-2.5 px-4 text-right">Từ mới</th>
                  <th className="py-2.5 px-4 text-right">Từ thêm</th>
                  <th className="py-2.5 pl-4 text-right">XP</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {dailyStats.map((d) => (
                  <tr key={d.day} className="hover:bg-surface-2/50">
                    <td className="py-2 pr-4 font-mono text-xs">{d.day}</td>
                    <td className="py-2 px-4 text-right tabular-nums">{d.reviews}</td>
                    <td className="py-2 px-4 text-right tabular-nums">{d.correct}</td>
                    <td className="py-2 px-4 text-right tabular-nums">{d.new_learned}</td>
                    <td className="py-2 px-4 text-right tabular-nums">{d.words_added}</td>
                    <td className="py-2 pl-4 text-right font-semibold tabular-nums text-grape-fg">
                      +{d.xp}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-fg-muted">Chưa có số liệu thống kê 30 ngày qua.</p>
        )}
      </Section>

      <Section title="200 lượt ôn gần nhất">
        <form action={`/admin/users/${userId}`} className="mb-4 flex items-center gap-3">
          <input type="hidden" name="tab" value="reviews" />
          <label htmlFor="review-mode" className="text-sm text-fg-muted font-medium">
            Chế độ ôn:
          </label>
          <select
            id="review-mode"
            name="mode"
            defaultValue={mode ?? ""}
            className="h-9 rounded-md border border-input bg-surface px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <option value="">Tất cả chế độ</option>
            <option value="flashcard">Thẻ ghi nhớ (flashcard)</option>
            <option value="quiz">Trắc nghiệm (quiz)</option>
            <option value="typing">Gõ từ (typing)</option>
            <option value="listening">Luyện nghe (listening)</option>
            <option value="cloze">Điền khuyết (cloze)</option>
            <option value="writing">Tập viết (writing)</option>
            <option value="tones">Thanh điệu (tones)</option>
          </select>
          <Button type="submit" size="sm">
            Lọc
          </Button>
        </form>

        {logs.length ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-border text-xs font-semibold uppercase text-fg-muted">
                <tr>
                  <th className="py-2.5 pr-4">Thời gian</th>
                  <th className="py-2.5 px-4">Từ vựng</th>
                  <th className="py-2.5 px-4">Chế độ</th>
                  <th className="py-2.5 px-4">Đánh giá</th>
                  <th className="py-2.5 px-4 text-center">Kết quả</th>
                  <th className="py-2.5 pl-4 text-right">Thời gian</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {logs.map((r) => {
                  const rating = RATING[r.rating];
                  return (
                    <tr key={r.id} className="hover:bg-surface-2/50">
                      <td className="py-2 pr-4 text-xs text-fg-subtle tabular-nums whitespace-nowrap">
                        {dateTime(r.reviewedAt, true)}
                      </td>
                      <td className="py-2 px-4 font-semibold text-fg">{r.term}</td>
                      <td className="py-2 px-4 text-fg-muted text-xs">
                        {MODE_INFO[r.mode as PracticeMode]?.label ?? r.mode}
                      </td>
                      <td className="py-2 px-4">
                        {rating && (
                          <Badge variant="soft" tone={rating.tone} className="text-xs">
                            {rating.label}
                          </Badge>
                        )}
                      </td>
                      <td className="py-2 px-4 text-center">
                        {r.correct === true ? (
                          <span className="text-xs font-bold text-success-fg">Đúng</span>
                        ) : r.correct === false ? (
                          <span className="text-xs font-bold text-danger-fg">Sai</span>
                        ) : (
                          <span className="text-fg-subtle">-</span>
                        )}
                      </td>
                      <td className="py-2 pl-4 text-right tabular-nums text-xs text-fg-muted">
                        {r.durationMs ? `${(r.durationMs / 1000).toFixed(1)}s` : "-"}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-fg-muted">Không tìm thấy lượt ôn nào.</p>
        )}
      </Section>
    </div>
  );
}

async function UserChatTab({
  userId,
  sp,
}: {
  userId: string;
  sp: Record<string, string | string[] | undefined>;
}) {
  const threads = await listUserChats(userId);
  const requestedThread = typeof sp.thread === "string" ? sp.thread : undefined;
  const activeThreadId = requestedThread || (threads.length > 0 ? threads[0].id : undefined);

  let messages = undefined;
  if (activeThreadId) {
    messages = await getUserChat(activeThreadId);
  }

  return (
    <section aria-label="Cuộc trò chuyện với gia sư">
      <AdminChatViewer
        threads={threads}
        activeThreadId={activeThreadId}
        messages={messages}
        userId={userId}
      />
    </section>
  );
}

async function UserAccountTab({
  userId,
  self,
  isAdmin,
}: {
  userId: string;
  self: boolean;
  isAdmin: boolean;
}) {
  const account = await getUserAccount(userId);
  if (!account) return <p className="text-fg-muted">Không tìm thấy thông tin tài khoản.</p>;

  return (
    <div className="flex flex-col gap-6">
      <Section title="Dữ liệu xác thực (Auth)">
        <dl className="grid grid-cols-[auto_1fr] gap-x-6 gap-y-2 text-sm">
          <dt className="text-fg-muted">ID người dùng</dt>
          <dd className="font-mono text-xs">{account.user.id}</dd>

          <dt className="text-fg-muted">Email</dt>
          <dd className="font-medium text-fg">{account.user.email}</dd>

          <dt className="text-fg-muted">Xác nhận email</dt>
          <dd>
            {account.user.emailConfirmedAt ? (
              <span className="text-success-fg">Đã xác nhận ({dateTime(account.user.emailConfirmedAt, true)})</span>
            ) : (
              <span className="text-danger-fg">Chưa xác nhận</span>
            )}
          </dd>

          <dt className="text-fg-muted">Phương thức đăng nhập</dt>
          <dd className="capitalize">{account.user.provider}</dd>

          <dt className="text-fg-muted">Ngày tạo</dt>
          <dd>{dateTime(account.user.createdAt, true)}</dd>

          <dt className="text-fg-muted">Đăng nhập gần nhất</dt>
          <dd>{dateTime(account.user.lastSignInAt, true)}</dd>

          <dt className="text-fg-muted">Khóa tài khoản</dt>
          <dd>
            {account.user.bannedUntil ? (
              <span className="text-danger-fg font-semibold">
                Khóa đến {dateTime(account.user.bannedUntil, true)}
              </span>
            ) : (
              <span className="text-success-fg">Bình thường</span>
            )}
          </dd>
        </dl>

        {account.user.metadata && Object.keys(account.user.metadata).length > 0 && (
          <div className="mt-4 pt-3 border-t border-border">
            <h4 className="text-xs font-bold uppercase tracking-wider text-fg-muted mb-2">User Metadata</h4>
            <pre className="overflow-x-auto rounded bg-surface-2 p-3 text-xs font-mono text-fg border border-border">
              {JSON.stringify(account.user.metadata, null, 2)}
            </pre>
          </div>
        )}
      </Section>

      <Section title="Cài đặt học tập (user_settings)">
        {account.settings ? (
          <div className="space-y-4">
            <dl className="grid grid-cols-[auto_1fr] gap-x-6 gap-y-2 text-sm">
              <dt className="text-fg-muted">Ngôn ngữ học</dt>
              <dd>{account.settings.studyLangs.map((l) => (l === "zh" ? "Tiếng Trung" : "Tiếng Anh")).join(", ")}</dd>

              <dt className="text-fg-muted">Mục tiêu ôn/ngày</dt>
              <dd className="tabular-nums">{account.settings.dailyGoal} lượt</dd>

              <dt className="text-fg-muted">Từ mới mỗi ngày</dt>
              <dd className="tabular-nums">{account.settings.dailyNewLimit} từ</dd>

              <dt className="text-fg-muted">Múi giờ</dt>
              <dd>{account.settings.timezone}</dd>

              <dt className="text-fg-muted">Đã hoàn thành onboarding</dt>
              <dd>{account.settings.onboarded ? "Rồi" : "Chưa"}</dd>
            </dl>

            {account.settings.prefs && Object.keys(account.settings.prefs).length > 0 && (
              <div className="pt-3 border-t border-border">
                <h4 className="text-xs font-bold uppercase tracking-wider text-fg-muted mb-2">Tùy chọn khác (prefs)</h4>
                <div className="overflow-x-auto rounded border border-border">
                  <table className="w-full text-left text-xs font-mono">
                    <thead className="bg-surface-2 border-b border-border">
                      <tr>
                        <th className="p-2">Khóa</th>
                        <th className="p-2">Giá trị</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {Object.entries(account.settings.prefs).map(([k, v]) => (
                        <tr key={k}>
                          <td className="p-2 font-semibold text-fg">{k}</td>
                          <td className="p-2 text-fg-muted">{JSON.stringify(v)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        ) : (
          <p className="text-fg-muted">Chưa có bản ghi cài đặt.</p>
        )}
      </Section>

      <Section title="Thiết bị & AI">
        <dl className="grid grid-cols-[auto_1fr] gap-x-6 gap-y-2 text-sm">
          <dt className="text-fg-muted">Thiết bị nhận thông báo</dt>
          <dd className="tabular-nums font-semibold">
            {account.pushDevicesCount} thiết bị (không lưu endpoint/khóa)
          </dd>

          <dt className="text-fg-muted">Lượt dùng AI 30 ngày qua</dt>
          <dd className="tabular-nums font-semibold">{account.aiUsage30d} lượt</dd>

          <dt className="text-fg-muted">Nhóm tham gia</dt>
          <dd>
            {account.groups.length ? (
              <ul className="flex flex-col gap-1">
                {account.groups.map((g) => (
                  <li key={g.id}>
                    {g.name} <span className="text-xs text-fg-muted">({g.role})</span>
                  </li>
                ))}
              </ul>
            ) : (
              "Chưa tham gia nhóm nào"
            )}
          </dd>
        </dl>
      </Section>

      <Section title="Xuất dữ liệu & Thao tác quản trị">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h4 className="font-semibold text-fg">Xuất toàn bộ dữ liệu tài khoản</h4>
            <p className="text-xs text-fg-muted mt-0.5">
              Tải file JSON chứa toàn bộ hồ sơ, bộ từ, từ vựng, thẻ ôn, lịch sử học tập và cuộc trò chuyện gia sư.
            </p>
          </div>
          <Button asChild variant="outline" className="gap-1.5 shrink-0">
            <a href={`/api/admin/users/${userId}/export`} download>
              <Download className="size-4" aria-hidden />
              Tải toàn bộ dữ liệu (JSON)
            </a>
          </Button>
        </div>

        {!self && !isAdmin && (
          <div className="mt-5 pt-4 border-t border-border flex flex-wrap gap-2">
            <AdminAction
              label={account.user.bannedUntil ? "Mở khóa tài khoản" : "Khóa tài khoản"}
              run={setUserBanned.bind(null, { userId, banned: !account.user.bannedUntil })}
              done={account.user.bannedUntil ? "Đã mở khóa tài khoản." : "Đã khóa tài khoản."}
              confirm={
                account.user.bannedUntil
                  ? undefined
                  : {
                      title: `Khóa tài khoản ${account.user.email}?`,
                      text: "Người này không đăng nhập được nữa cho tới khi bạn mở khóa. Dữ liệu vẫn giữ nguyên.",
                      action: "Khóa tài khoản",
                    }
              }
            />
            <AdminAction
              label="Xóa hẳn tài khoản"
              destructive
              run={deleteUserAccount.bind(null, { userId })}
              done="Đã xóa tài khoản."
              confirm={{
                title: `Xóa hẳn tài khoản ${account.user.email}?`,
                text: "Xóa tài khoản, ảnh, bộ từ, tiến độ ôn và các nhóm người này làm chủ. Không hoàn tác được.",
                action: "Xóa tài khoản",
              }}
            />
          </div>
        )}
      </Section>
    </div>
  );
}
