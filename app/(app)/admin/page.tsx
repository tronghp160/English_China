import {
  BookOpen,
  Bot,
  Flame,
  Globe,
  MapPin,
  Radio,
  ShieldCheck,
  Sparkles,
  Trophy,
  UserPlus,
  Users,
  UsersRound,
  type LucideIcon,
} from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { AdminAction, GrantAdminForm } from "@/components/admin/admin-actions";
import { AdminWordTable } from "@/components/admin/admin-word-table";
import { AutoRefresh } from "@/components/admin/auto-refresh";
import { OnlineDot } from "@/components/admin/online-dot";
import { PetChip } from "@/components/admin/pet-chip";
import { StatCard } from "@/components/admin/stat-card";
import { AttentionTab } from "@/components/admin/tabs/attention-tab";
import { AuditTab } from "@/components/admin/tabs/audit-tab";
import { OnlineTab } from "@/components/admin/tabs/online-tab";
import { WarmCacheCard } from "@/components/admin/warm-cache";
import { LangMark } from "@/components/lang-mark";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { IconTile } from "@/components/ui/icon-tile";
import { Input } from "@/components/ui/input";
import { SegmentedNav } from "@/components/ui/segmented";
import {
  deleteDeckAsAdmin,
  deleteGroupAsAdmin,
  deleteUserAccount,
  hidePublicDeck,
  revokeAdmin,
  setUserBanned,
} from "@/lib/actions/admin";
import { ago, dateTime } from "@/lib/admin-format";
import { requireAdmin } from "@/lib/admin";
import {
  getAdminOverview,
  listAdmins,
  listAdminWords,
  listGroups,
  listPublicDecks,
  resolveUserParam,
} from "@/lib/data/admin";
import { getActivitySummary, listUsersForAdmin } from "@/lib/data/admin-monitor";
import { serverEnv } from "@/lib/env";
import type { Tone } from "@/lib/tone";

export const metadata: Metadata = { title: "Quản trị", robots: { index: false } };

const TABS = [
  { value: "overview", label: "Tổng quan" },
  { value: "online", label: "Đang online" },
  { value: "users", label: "Người dùng" },
  { value: "attention", label: "Cần chú ý" },
  { value: "words", label: "Từ vựng" },
  { value: "decks", label: "Bộ từ công khai" },
  { value: "groups", label: "Nhóm" },
  { value: "audit", label: "Nhật ký" },
  { value: "admins", label: "Quản trị viên" },
] as const;
type Tab = (typeof TABS)[number]["value"];

const date = (iso: string | null) =>
  iso
    ? new Intl.DateTimeFormat("vi-VN", { timeZone: "Asia/Ho_Chi_Minh", dateStyle: "short" }).format(
        new Date(iso),
      )
    : "chưa";

export default async function AdminPage({ searchParams }: PageProps<"/admin">) {
  const me = await requireAdmin();
  const sp = await searchParams;
  const tab: Tab = TABS.some((t) => t.value === sp.tab) ? (sp.tab as Tab) : "overview";
  const q = typeof sp.q === "string" ? sp.q.slice(0, 100) : "";
  const page = Math.max(1, Number(typeof sp.page === "string" ? sp.page : 1) || 1);
  const status = typeof sp.status === "string" ? sp.status : "all";
  const sort = typeof sp.sort === "string" ? sp.sort : "created";
  const lang = sp.lang === "en" || sp.lang === "zh" ? sp.lang : undefined;
  const user = typeof sp.user === "string" ? sp.user.slice(0, 100) : undefined;
  const action = typeof sp.action === "string" ? sp.action : undefined;

  return (
    <div className="max-w-4xl">
      <div className="flex items-center gap-3">
        <IconTile icon={ShieldCheck} tone="grape" size={44} solid />
        <div>
          <h1 className="text-[1.6875rem] leading-tight sm:text-[2.125rem]">Quản trị</h1>
          <p className="text-sm text-fg-muted">
            Chỉ quản trị viên thấy trang này. Mọi thao tác đều có hiệu lực ngay.
          </p>
        </div>
      </div>
      <SegmentedNav
        label="Mục quản trị"
        scroll
        className="mt-5"
        items={TABS.map((t) => ({
          label: t.label,
          href: `/admin?tab=${t.value}`,
          active: t.value === tab,
        }))}
      />
      <div className="mt-6">
        {tab === "overview" && <Overview />}
        {tab === "online" && <OnlineTab meId={me.id} />}
        {tab === "users" && <UsersTab meId={me.id} q={q} page={page} status={status} sort={sort} />}
        {tab === "attention" && <AttentionTab />}
        {tab === "words" && <WordsTab q={q} lang={lang} user={user} page={page} />}
        {tab === "decks" && <DecksTab />}
        {tab === "groups" && <GroupsTab />}
        {tab === "audit" && <AuditTab action={action} page={page} />}
        {tab === "admins" && <AdminsTab meId={me.id} />}
      </div>
    </div>
  );
}

function Stat({
  icon,
  tone,
  value,
  label,
  hint,
}: {
  icon: LucideIcon;
  tone: Tone;
  value: string;
  label: string;
  hint?: string;
}) {
  return (
    <div className="flex items-center gap-3 rounded-lg bg-surface p-4 shadow-sm dark:border dark:border-border">
      <IconTile icon={icon} tone={tone} size={44} />
      <div className="min-w-0">
        <p className="font-display text-2xl leading-none font-extrabold tabular-nums">{value}</p>
        <p className="mt-1 text-sm text-fg-muted">{label}</p>
        {hint && <p className="text-xs text-fg-subtle">{hint}</p>}
      </div>
    </div>
  );
}

async function Overview() {
  const [o, act] = await Promise.all([getAdminOverview(), getActivitySummary()]);

  const maxActive = Math.max(1, ...act.activeByDay.map((d) => d.active), ...act.newByDay.map((d) => d.count));
  const maxBucket = Math.max(
    1,
    act.levelBuckets["1-2"],
    act.levelBuckets["3-4"],
    act.levelBuckets["5-9"],
    act.levelBuckets["10+"],
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-lg font-bold">Hoạt động & Tương tác</h2>
        <AutoRefresh seconds={60} />
      </div>

      {/* Row of 4 cards: Online now, DAU, WAU, MAU */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard icon={Radio} tone="mint" value={act.onlineNow} label="Đang online" />
        <StatCard
          icon={Sparkles}
          tone="sun"
          value={act.dau}
          label="Hoạt động hôm nay (DAU)"
          hint="Người có ít nhất 1 lượt ôn"
        />
        <StatCard icon={Flame} tone="blue" value={act.wau} label="7 ngày (WAU)" />
        <StatCard icon={Trophy} tone="grape" value={act.mau} label="30 ngày (MAU)" />
      </div>

      {/* 14-day activity chart */}
      <section className="rounded-lg bg-surface p-5 shadow-sm dark:border dark:border-border">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3 className="text-base font-bold">Người học mỗi ngày (14 ngày qua)</h3>
          <div className="flex items-center gap-4 text-xs text-fg-muted">
            <span className="flex items-center gap-1.5">
              <span className="size-2.5 rounded-sm bg-primary" />
              Người học
            </span>
            <span className="flex items-center gap-1.5">
              <span className="size-2.5 rounded-sm bg-c-mint" />
              Đăng ký mới
            </span>
          </div>
        </div>

        <div
          role="img"
          aria-label={`Biểu đồ người học và đăng ký mới 14 ngày qua, cao nhất ${maxActive}`}
          className="mt-4 flex h-36 items-end gap-2"
        >
          {act.activeByDay.map((d, i) => {
            const newCount = act.newByDay[i]?.count ?? 0;
            const activeHeight = Math.max(3, (d.active / maxActive) * 100);
            const newHeight = Math.max(3, (newCount / maxActive) * 100);

            return (
              <div key={d.day} className="flex flex-1 flex-col items-center gap-1">
                <div className="flex h-28 w-full items-end justify-center gap-1">
                  <div
                    title={`${d.day}: ${d.active} người học`}
                    className="w-full max-w-4 rounded-t bg-primary transition-all"
                    style={{ height: d.active > 0 ? `${activeHeight}%` : "3px" }}
                  />
                  <div
                    title={`${d.day}: ${newCount} đăng ký mới`}
                    className="w-full max-w-4 rounded-t bg-c-mint transition-all"
                    style={{ height: newCount > 0 ? `${newHeight}%` : "3px" }}
                  />
                </div>
                <span className="text-[10px] text-fg-subtle truncate">{d.day.slice(5)}</span>
              </div>
            );
          })}
        </div>
        <div className="mt-2 flex justify-between text-xs text-fg-muted tabular-nums">
          <span>{act.activeByDay[0]?.day}</span>
          <span>Hôm nay ({act.activeByDay[act.activeByDay.length - 1]?.day})</span>
        </div>
      </section>

      {/* Middle row: Top Cities & Level Distribution */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Top Cities */}
        <section className="rounded-lg bg-surface p-5 shadow-sm dark:border dark:border-border">
          <div className="mb-3 flex items-center gap-2">
            <MapPin className="size-5 text-c-teal" aria-hidden="true" />
            <h3 className="text-base font-bold">Nơi đăng nhập nhiều nhất (30 ngày)</h3>
          </div>
          {act.topCities.length === 0 ? (
            <p className="text-sm text-fg-muted">Chưa ghi nhận dữ liệu vị trí.</p>
          ) : (
            <ul className="divide-y divide-border">
              {act.topCities.map((c, i) => (
                <li key={i} className="flex items-center justify-between py-2 text-sm">
                  <span>
                    {c.city}
                    {c.country && <span className="text-xs text-fg-muted"> ({c.country})</span>}
                  </span>
                  <span className="font-semibold tabular-nums text-fg">
                    {c.users} người
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>

        {/* Level Distribution of Bin */}
        <section className="rounded-lg bg-surface p-5 shadow-sm dark:border dark:border-border">
          <div className="mb-3 flex items-center gap-2">
            <Sparkles className="size-5 text-c-sun" aria-hidden="true" />
            <h3 className="text-base font-bold">Cấp của chú cún Bin</h3>
          </div>
          <div className="space-y-3">
            {(
              [
                { label: "Cấp 1 – 2", key: "1-2" as const, tone: "bg-surface-3 text-fg" },
                { label: "Cấp 3 – 4", key: "3-4" as const, tone: "bg-c-blue" },
                { label: "Cấp 5 – 9", key: "5-9" as const, tone: "bg-c-grape" },
                { label: "Cấp 10+", key: "10+" as const, tone: "bg-c-sun" },
              ] as const
            ).map((b) => {
              const count = act.levelBuckets[b.key];
              const pct = Math.round((count / maxBucket) * 100);

              return (
                <div key={b.key} className="space-y-1">
                  <div className="flex justify-between text-xs">
                    <span className="font-medium text-fg">{b.label}</span>
                    <span className="text-fg-muted tabular-nums">{count} người</span>
                  </div>
                  <div className="h-2 w-full overflow-hidden rounded-full bg-surface-2">
                    <div
                      className={`h-full rounded-full ${b.tone}`}
                      style={{ width: `${count > 0 ? Math.max(5, pct) : 0}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      </div>

      {/* Top XP Users */}
      {act.topXp.length > 0 && (
        <section className="rounded-lg bg-surface p-5 shadow-sm dark:border dark:border-border">
          <div className="mb-3 flex items-center gap-2">
            <Trophy className="size-5 text-c-sun" aria-hidden="true" />
            <h3 className="text-base font-bold">Người dùng có điểm kinh nghiệm (XP) cao nhất</h3>
          </div>
          <ul className="divide-y divide-border">
            {act.topXp.map((u, i) => (
              <li key={u.userId} className="flex items-center justify-between py-2.5 text-sm">
                <div className="flex items-center gap-2.5 min-w-0">
                  <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-surface-2 text-xs font-bold tabular-nums">
                    {i + 1}
                  </span>
                  <Link
                    href={`/admin/users/${u.userId}`}
                    className="font-medium truncate hover:underline text-fg"
                  >
                    {u.displayName}
                  </Link>
                  {u.username && <span className="text-xs text-fg-muted">@{u.username}</span>}
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <PetChip level={u.level} outfit="none" streak={0} />
                  <span className="font-bold tabular-nums text-fg">{u.totalXp} XP</span>
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* Existing overview stats */}
      <div>
        <h3 className="mb-3 text-base font-bold">Thống kê tài nguyên & AI</h3>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <Stat icon={Users} tone="blue" value={String(o.users)} label="Người dùng" />
          <Stat icon={UserPlus} tone="mint" value={String(o.newUsers7d)} label="Đăng ký trong 7 ngày" />
          <Stat icon={Sparkles} tone="sun" value={String(o.activeToday)} label="Người học hôm nay" />
          <Stat icon={BookOpen} tone="coral" value={String(o.reviewsToday)} label="Lượt ôn hôm nay" />
          <Stat
            icon={Bot}
            tone="grape"
            value={`${o.aiToday}/${o.aiLimit}`}
            label="Lượt AI hôm nay"
            hint="Giới hạn chung mỗi ngày (AI_GLOBAL_DAILY_LIMIT)"
          />
          <Stat
            icon={Globe}
            tone="teal"
            value={`${o.publicDecks}/${o.decks}`}
            label="Bộ từ công khai / tất cả"
          />
          <Stat icon={UsersRound} tone="orange" value={String(o.groups)} label="Nhóm" />
        </div>
      </div>

      <WarmCacheCard rpmLimit={serverEnv().AI_RPM_LIMIT} />
    </div>
  );
}

async function UsersTab({
  meId,
  q,
  page,
  status,
  sort,
}: {
  meId: string;
  q: string;
  page: number;
  status: string;
  sort: string;
}) {
  const { users, total, totalPages } = await listUsersForAdmin({ q, page, status, sort });
  const link = (p: number) => {
    const params = new URLSearchParams({ tab: "users", page: String(p) });
    if (q) params.set("q", q);
    if (status && status !== "all") params.set("status", status);
    if (sort && sort !== "created") params.set("sort", sort);
    return `/admin?${params.toString()}`;
  };

  return (
    <section aria-label="Người dùng">
      <form action="/admin" className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <input type="hidden" name="tab" value="users" />
        <label htmlFor="admin-q" className="sr-only">
          Tìm người dùng
        </label>
        <Input
          id="admin-q"
          name="q"
          defaultValue={q}
          placeholder="Tìm theo email, tên hoặc @username"
          className="flex-1"
        />
        <div className="w-full sm:w-44">
          <label htmlFor="user-status" className="sr-only">
            Trạng thái
          </label>
          <select
            id="user-status"
            name="status"
            defaultValue={status}
            className="h-10 w-full rounded-md border border-input bg-surface px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <option value="all">Tất cả trạng thái</option>
            <option value="online">Đang online</option>
            <option value="away">Vừa rời đi</option>
            <option value="offline">Offline</option>
            <option value="never">Chưa ghi nhận</option>
            <option value="inactive7">Không học 7 ngày+</option>
            <option value="unstudied">Chưa học bài nào</option>
            <option value="banned">Bị khóa</option>
            <option value="admin">Quản trị</option>
          </select>
        </div>
        <div className="w-full sm:w-44">
          <label htmlFor="user-sort" className="sr-only">
            Sắp xếp
          </label>
          <select
            id="user-sort"
            name="sort"
            defaultValue={sort}
            className="h-10 w-full rounded-md border border-input bg-surface px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <option value="created">Mới tạo</option>
            <option value="lastSeen">Online gần nhất</option>
            <option value="level">Cấp cao nhất</option>
            <option value="lastActive">Học gần nhất</option>
          </select>
        </div>
        <Button type="submit">Tìm</Button>
      </form>
      <p className="mt-3 text-sm text-fg-muted">
        {total} tài khoản{q && ` khớp "${q}"`}
      </p>
      <ul className="mt-3 flex flex-col gap-2.5">
        {users.map((u) => {
          const self = u.id === meId;
          return (
            <li
              key={u.id}
              className="flex flex-col gap-3 rounded-lg bg-surface p-4 shadow-sm sm:flex-row sm:items-center dark:border dark:border-border"
            >
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-1.5">
                  <OnlineDot status={u.status} />
                  <Link href={`/admin/users/${u.id}`} className="font-bold hover:underline">
                    {u.displayName}
                  </Link>
                  {u.username && <span className="text-sm text-fg-muted">@{u.username}</span>}
                  {self && (
                    <Badge variant="soft" tone="blue">
                      Bạn
                    </Badge>
                  )}
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
                <p className="truncate text-sm text-fg">{u.email}</p>
                <p className="text-sm text-fg-muted">
                  Tạo {dateTime(u.createdAt)} · Online {ago(u.lastSeenAt)} · {u.place}
                  {u.deviceModel ? ` · ${u.deviceModel}` : ""} · {u.decks} bộ từ
                </p>
                {u.pet && (
                  <div className="mt-1.5">
                    <PetChip
                      level={u.pet.level}
                      outfit={u.pet.outfit}
                      outfitName={u.pet.outfitName}
                      streak={u.pet.streak}
                    />
                  </div>
                )}
              </div>
              <div className="flex shrink-0 flex-wrap gap-2">
                <Button asChild size="sm" variant="soft" tone="blue">
                  <Link href={`/admin/users/${u.id}`}>Xem chi tiết</Link>
                </Button>
                {!self && !u.admin && (
                  <>
                    <AdminAction
                      label={u.banned ? "Mở khóa" : "Khóa"}
                      run={setUserBanned.bind(null, { userId: u.id, banned: !u.banned })}
                      done={u.banned ? "Đã mở khóa tài khoản." : "Đã khóa tài khoản."}
                      confirm={
                        u.banned
                          ? undefined
                          : {
                              title: `Khóa tài khoản ${u.email}?`,
                              text: "Người này không đăng nhập được nữa cho tới khi bạn mở khóa. Phiên đang mở hết hạn trong khoảng một giờ. Dữ liệu vẫn giữ nguyên.",
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
                  </>
                )}
              </div>
            </li>
          );
        })}
      </ul>
      {totalPages > 1 && (
        <nav aria-label="Trang" className="mt-4 flex items-center justify-between gap-3">
          {page > 1 ? (
            <Button asChild variant="outline">
              <Link href={link(page - 1)}>Trang trước</Link>
            </Button>
          ) : (
            <span />
          )}
          <span className="text-sm text-fg-muted tabular-nums">
            Trang {page}/{totalPages}
          </span>
          {page < totalPages ? (
            <Button asChild variant="outline">
              <Link href={link(page + 1)}>Trang sau</Link>
            </Button>
          ) : (
            <span />
          )}
        </nav>
      )}
    </section>
  );
}

async function WordsTab({
  q,
  lang,
  user,
  page,
}: {
  q: string;
  lang?: "en" | "zh";
  user?: string;
  page: number;
}) {
  let creatorId: string | undefined;
  if (user) {
    const resolved = await resolveUserParam(user);
    creatorId = resolved ?? "00000000-0000-0000-0000-000000000000";
  }

  const { rows, total } = await listAdminWords({ q, lang, creatorId, page });

  const queryParams = new URLSearchParams();
  queryParams.set("tab", "words");
  if (q) queryParams.set("q", q);
  if (lang) queryParams.set("lang", lang);
  if (user) queryParams.set("user", user);

  return (
    <section aria-label="Từ vựng">
      <form action="/admin" className="flex flex-col gap-2 sm:flex-row sm:items-center mb-4">
        <input type="hidden" name="tab" value="words" />
        <div className="flex-1">
          <label htmlFor="words-q" className="sr-only">
            Tìm từ vựng
          </label>
          <Input
            id="words-q"
            name="q"
            defaultValue={q}
            placeholder="Tìm theo từ hoặc nghĩa..."
          />
        </div>
        <div className="w-full sm:w-40">
          <label htmlFor="words-lang" className="sr-only">
            Ngôn ngữ
          </label>
          <select
            id="words-lang"
            name="lang"
            defaultValue={lang ?? ""}
            className="w-full h-10 rounded-md border border-input bg-surface px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <option value="">Tất cả ngôn ngữ</option>
            <option value="en">Tiếng Anh</option>
            <option value="zh">Tiếng Trung</option>
          </select>
        </div>
        <div className="w-full sm:w-56">
          <label htmlFor="words-user" className="sr-only">
            Người tạo
          </label>
          <Input
            id="words-user"
            name="user"
            defaultValue={user ?? ""}
            placeholder="Email hoặc @username"
          />
        </div>
        <Button type="submit">Lọc</Button>
      </form>

      <AdminWordTable
        rows={rows}
        total={total}
        page={page}
        baseHref={`/admin?${queryParams.toString()}`}
        showCreator={true}
        showDeck={true}
      />
    </section>
  );
}

async function DecksTab() {
  const decks = await listPublicDecks();
  if (!decks.length) return <p className="text-fg-muted">Chưa có bộ từ công khai nào.</p>;
  return (
    <section aria-label="Bộ từ công khai">
      <p className="mb-3 text-sm text-fg-muted">
        Các bộ từ đang hiện ở trang Khám phá. “Ẩn” đưa bộ từ về riêng tư của chủ, không xóa gì.
      </p>
      <ul className="flex flex-col gap-2.5">
        {decks.map((d) => (
          <li
            key={d.id}
            className="flex flex-col gap-3 rounded-lg bg-surface p-4 shadow-sm sm:flex-row sm:items-center dark:border dark:border-border"
          >
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <LangMark lang={d.language} />
                <Link href={`/admin/decks/${d.id}`} className="truncate font-bold hover:underline">
                  {d.name}
                </Link>
              </div>
              <p className="text-sm text-fg-muted">
                @{d.owner} · {d.wordCount} từ · {d.learners} người học · tạo {date(d.createdAt)}
              </p>
            </div>
            <div className="flex shrink-0 flex-wrap gap-2">
              <AdminAction
                label="Ẩn khỏi Khám phá"
                run={hidePublicDeck.bind(null, { deckId: d.id })}
                done="Đã ẩn bộ từ."
                confirm={{
                  title: `Ẩn "${d.name}"?`,
                  text: "Bộ từ thành riêng tư của chủ; người đang học vẫn giữ tiến độ của mình.",
                  action: "Ẩn bộ từ",
                }}
              />
              <AdminAction
                label="Xóa"
                destructive
                run={deleteDeckAsAdmin.bind(null, { deckId: d.id })}
                done="Đã xóa bộ từ."
                confirm={{
                  title: `Xóa hẳn "${d.name}"?`,
                  text: "Xóa bộ từ, mọi từ trong đó và tiến độ ôn của mọi người với các từ này. Không hoàn tác được.",
                  action: "Xóa bộ từ",
                }}
              />
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}

async function GroupsTab() {
  const groups = await listGroups();
  if (!groups.length) return <p className="text-fg-muted">Chưa có nhóm nào.</p>;
  return (
    <section aria-label="Nhóm">
      <ul className="flex flex-col gap-2.5">
        {groups.map((g) => (
          <li
            key={g.id}
            className="flex flex-col gap-3 rounded-lg bg-surface p-4 shadow-sm sm:flex-row sm:items-center dark:border dark:border-border"
          >
            <div className="min-w-0 flex-1">
              <p className="truncate font-bold">{g.name}</p>
              <p className="text-sm text-fg-muted">
                Chủ nhóm @{g.owner} · {g.members} thành viên · tạo {date(g.createdAt)}
              </p>
            </div>
            <AdminAction
              label="Xóa nhóm"
              destructive
              run={deleteGroupAsAdmin.bind(null, { groupId: g.id })}
              done="Đã xóa nhóm."
              confirm={{
                title: `Xóa nhóm "${g.name}"?`,
                text: "Các bộ từ của nhóm trở về thành bộ từ riêng của người tạo. Không hoàn tác được.",
                action: "Xóa nhóm",
              }}
            />
          </li>
        ))}
      </ul>
    </section>
  );
}

async function AdminsTab({ meId }: { meId: string }) {
  const admins = await listAdmins();
  return (
    <section aria-label="Quản trị viên" className="flex flex-col gap-5">
      <div className="rounded-lg bg-surface p-4 shadow-sm dark:border dark:border-border">
        <h2 className="text-lg">Cấp quyền quản trị</h2>
        <p className="mt-1 mb-3 text-sm text-fg-muted">
          Nhập email của một tài khoản đã đăng ký. Người đó thấy mục “Quản trị” trong menu tài
          khoản.
        </p>
        <GrantAdminForm />
      </div>
      <ul className="flex flex-col gap-2.5">
        {admins.map((a) => (
          <li
            key={a.email}
            className="flex flex-col gap-3 rounded-lg bg-surface p-4 shadow-sm sm:flex-row sm:items-center dark:border dark:border-border"
          >
            <div className="min-w-0 flex-1">
              <p className="truncate font-bold">{a.email}</p>
              <p className="text-sm text-fg-muted">
                {a.envAdmin
                  ? "Trong ADMIN_EMAILS (đổi ở biến môi trường)"
                  : `Được cấp ngày ${date(a.grantedAt)}`}
              </p>
            </div>
            {a.userId && a.userId !== meId && (
              <AdminAction
                label="Gỡ quyền"
                destructive
                run={revokeAdmin.bind(null, { userId: a.userId })}
                done="Đã gỡ quyền quản trị."
                confirm={{
                  title: `Gỡ quyền của ${a.email}?`,
                  text: "Người này vẫn dùng Sổ Từ bình thường, chỉ không vào được trang Quản trị.",
                  action: "Gỡ quyền",
                }}
              />
            )}
          </li>
        ))}
      </ul>
    </section>
  );
}
