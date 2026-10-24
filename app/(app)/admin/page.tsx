import { BookOpen, Bot, Globe, ShieldCheck, Sparkles, UserPlus, Users, UsersRound, type LucideIcon } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { AdminAction, GrantAdminForm } from "@/components/admin/admin-actions";
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
import { requireAdmin } from "@/lib/admin";
import {
  getAdminOverview,
  listAdmins,
  listAdminUsers,
  listGroups,
  listPublicDecks,
  USERS_PER_PAGE,
} from "@/lib/data/admin";
import type { Tone } from "@/lib/tone";

export const metadata: Metadata = { title: "Quản trị", robots: { index: false } };

const TABS = [
  { value: "overview", label: "Tổng quan" },
  { value: "users", label: "Người dùng" },
  { value: "decks", label: "Bộ từ công khai" },
  { value: "groups", label: "Nhóm" },
  { value: "admins", label: "Quản trị viên" },
] as const;
type Tab = (typeof TABS)[number]["value"];

const date = (iso: string | null) =>
  iso ? new Intl.DateTimeFormat("vi-VN", { timeZone: "Asia/Ho_Chi_Minh", dateStyle: "short" }).format(new Date(iso)) : "chưa";

export default async function AdminPage({ searchParams }: PageProps<"/admin">) {
  const me = await requireAdmin();
  const sp = await searchParams;
  const tab: Tab = TABS.some((t) => t.value === sp.tab) ? (sp.tab as Tab) : "overview";
  const q = typeof sp.q === "string" ? sp.q.slice(0, 100) : "";
  const page = Math.max(1, Number(typeof sp.page === "string" ? sp.page : 1) || 1);

  return (
    <div className="max-w-4xl">
      <div className="flex items-center gap-3">
        <IconTile icon={ShieldCheck} tone="grape" size={44} solid />
        <div>
          <h1 className="text-[1.6875rem] leading-tight sm:text-[2.125rem]">Quản trị</h1>
          <p className="text-sm text-fg-muted">Chỉ quản trị viên thấy trang này. Mọi thao tác đều có hiệu lực ngay.</p>
        </div>
      </div>
      <SegmentedNav
        label="Mục quản trị"
        scroll
        className="mt-5"
        items={TABS.map((t) => ({ label: t.label, href: `/admin?tab=${t.value}`, active: t.value === tab }))}
      />
      <div className="mt-6">
        {tab === "overview" && <Overview />}
        {tab === "users" && <UsersTab meId={me.id} q={q} page={page} />}
        {tab === "decks" && <DecksTab />}
        {tab === "groups" && <GroupsTab />}
        {tab === "admins" && <AdminsTab meId={me.id} />}
      </div>
    </div>
  );
}

function Stat({ icon, tone, value, label, hint }: { icon: LucideIcon; tone: Tone; value: string; label: string; hint?: string }) {
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
  const o = await getAdminOverview();
  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      <Stat icon={Users} tone="blue" value={String(o.users)} label="Người dùng" />
      <Stat icon={UserPlus} tone="mint" value={String(o.newUsers7d)} label="Đăng ký trong 7 ngày" />
      <Stat icon={Sparkles} tone="sun" value={String(o.activeToday)} label="Người học hôm nay" />
      <Stat icon={BookOpen} tone="coral" value={String(o.reviewsToday)} label="Lượt ôn hôm nay" />
      <Stat icon={Bot} tone="grape" value={`${o.aiToday}/${o.aiLimit}`} label="Lượt AI hôm nay" hint="Giới hạn chung mỗi ngày (AI_GLOBAL_DAILY_LIMIT)" />
      <Stat icon={Globe} tone="teal" value={`${o.publicDecks}/${o.decks}`} label="Bộ từ công khai / tất cả" />
      <Stat icon={UsersRound} tone="orange" value={String(o.groups)} label="Nhóm" />
    </div>
  );
}

async function UsersTab({ meId, q, page }: { meId: string; q: string; page: number }) {
  const { users, total } = await listAdminUsers({ q, page });
  const pages = Math.max(1, Math.ceil(total / USERS_PER_PAGE));
  const link = (p: number) => `/admin?tab=users&page=${p}${q ? `&q=${encodeURIComponent(q)}` : ""}`;
  return (
    <section aria-label="Người dùng">
      <form action="/admin" className="flex gap-2">
        <input type="hidden" name="tab" value="users" />
        <label htmlFor="admin-q" className="sr-only">
          Tìm người dùng
        </label>
        <Input id="admin-q" name="q" defaultValue={q} placeholder="Tìm theo email, tên hoặc @username" className="flex-1" />
        <Button type="submit">Tìm</Button>
      </form>
      <p className="mt-3 text-sm text-fg-muted">
        {total} tài khoản{q && ` khớp "${q}"`}
      </p>
      <ul className="mt-3 flex flex-col gap-2.5">
        {users.map((u) => {
          const self = u.id === meId;
          return (
            <li key={u.id} className="flex flex-col gap-3 rounded-lg bg-surface p-4 shadow-sm sm:flex-row sm:items-center dark:border dark:border-border">
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-1.5">
                  <span className="font-bold">{u.displayName}</span>
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
                  Tạo {date(u.createdAt)} · Đăng nhập gần nhất {date(u.lastSignInAt)} · {u.decks} bộ từ
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
                </div>
              )}
            </li>
          );
        })}
      </ul>
      {pages > 1 && (
        <nav aria-label="Trang" className="mt-4 flex items-center justify-between gap-3">
          {page > 1 ? (
            <Button asChild variant="outline">
              <Link href={link(page - 1)}>Trang trước</Link>
            </Button>
          ) : (
            <span />
          )}
          <span className="text-sm text-fg-muted tabular-nums">
            Trang {page}/{pages}
          </span>
          {page < pages ? (
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

async function DecksTab() {
  const decks = await listPublicDecks();
  if (!decks.length) return <p className="text-fg-muted">Chưa có bộ từ công khai nào.</p>;
  return (
    <section aria-label="Bộ từ công khai">
      <p className="mb-3 text-sm text-fg-muted">Các bộ từ đang hiện ở trang Khám phá. “Ẩn” đưa bộ từ về riêng tư của chủ, không xóa gì.</p>
      <ul className="flex flex-col gap-2.5">
        {decks.map((d) => (
          <li key={d.id} className="flex flex-col gap-3 rounded-lg bg-surface p-4 shadow-sm sm:flex-row sm:items-center dark:border dark:border-border">
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <LangMark lang={d.language} />
                <Link href={`/decks/${d.id}`} className="truncate font-bold hover:underline">
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
                confirm={{ title: `Ẩn "${d.name}"?`, text: "Bộ từ thành riêng tư của chủ; người đang học vẫn giữ tiến độ của mình.", action: "Ẩn bộ từ" }}
              />
              <AdminAction
                label="Xóa"
                destructive
                run={deleteDeckAsAdmin.bind(null, { deckId: d.id })}
                done="Đã xóa bộ từ."
                confirm={{ title: `Xóa hẳn "${d.name}"?`, text: "Xóa bộ từ, mọi từ trong đó và tiến độ ôn của mọi người với các từ này. Không hoàn tác được.", action: "Xóa bộ từ" }}
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
          <li key={g.id} className="flex flex-col gap-3 rounded-lg bg-surface p-4 shadow-sm sm:flex-row sm:items-center dark:border dark:border-border">
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
              confirm={{ title: `Xóa nhóm "${g.name}"?`, text: "Các bộ từ của nhóm trở về thành bộ từ riêng của người tạo. Không hoàn tác được.", action: "Xóa nhóm" }}
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
        <p className="mt-1 mb-3 text-sm text-fg-muted">Nhập email của một tài khoản đã đăng ký. Người đó thấy mục “Quản trị” trong menu tài khoản.</p>
        <GrantAdminForm />
      </div>
      <ul className="flex flex-col gap-2.5">
        {admins.map((a) => (
          <li key={a.email} className="flex flex-col gap-3 rounded-lg bg-surface p-4 shadow-sm sm:flex-row sm:items-center dark:border dark:border-border">
            <div className="min-w-0 flex-1">
              <p className="truncate font-bold">{a.email}</p>
              <p className="text-sm text-fg-muted">{a.envAdmin ? "Trong ADMIN_EMAILS (đổi ở biến môi trường)" : `Được cấp ngày ${date(a.grantedAt)}`}</p>
            </div>
            {a.userId && a.userId !== meId && (
              <AdminAction
                label="Gỡ quyền"
                destructive
                run={revokeAdmin.bind(null, { userId: a.userId })}
                done="Đã gỡ quyền quản trị."
                confirm={{ title: `Gỡ quyền của ${a.email}?`, text: "Người này vẫn dùng Sổ Từ bình thường, chỉ không vào được trang Quản trị.", action: "Gỡ quyền" }}
              />
            )}
          </li>
        ))}
      </ul>
    </section>
  );
}
