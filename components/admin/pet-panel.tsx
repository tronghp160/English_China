import {
  Award,
  Bone,
  Flame,
  Footprints,
  Gift,
  History,
  Mail,
  MessageSquare,
  Shield,
  Sofa,
  Sparkles,
  Zap,
} from "lucide-react";
import { OutfitIcon } from "@/components/mascot/outfits";
import { Pup } from "@/components/mascot/pup";
import { RoomItemIcon } from "@/components/mascot/room-items";
import { Badge } from "@/components/ui/badge";
import { IconTile } from "@/components/ui/icon-tile";
import type { PetSummary } from "@/lib/admin-pet";
import { dateTime } from "@/lib/admin-format";
import { ITEM_BY_ID, ROOM_SLOTS, SLOT_LABEL } from "@/lib/bin/catalog";
import { OUTFITS, outfitCondition } from "@/lib/progress";

const KIND_INFO: Record<string, { label: string; tone?: "blue" | "mint" | "orange" | "grape" }> = {
  migrate: { label: "Khởi tạo (v1)" },
  quest: { label: "Nhiệm vụ", tone: "blue" },
  feed: { label: "Cho ăn", tone: "orange" },
  buy: { label: "Mua đồ", tone: "grape" },
  trip: { label: "Đi dạo", tone: "mint" },
};

export function PetPanel({ pet }: { pet: PetSummary }) {
  const xpPct = Math.round(pet.level.progress * 100);

  return (
    <div className="space-y-6">
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Mascot showcase card */}
        <div className="rounded-lg bg-surface p-5 shadow-sm dark:border dark:border-border lg:col-span-1">
          <div className="flex flex-col items-center text-center">
            <div className="flex size-44 items-center justify-center rounded-2xl bg-surface-2 p-2">
              <Pup
                mood={pet.mood}
                outfit={pet.outfit}
                size={140}
                animated={false}
              />
            </div>
            <h3 className="mt-4 font-display text-xl font-bold">{pet.name}</h3>
            <div className="mt-2 flex flex-wrap justify-center gap-2">
              <Badge tone={pet.mascotOn ? "mint" : undefined} variant={pet.mascotOn ? "default" : "outline"}>
                {pet.mascotOn ? "Linh vật đang bật" : "Linh vật đã tắt"}
              </Badge>
              <Badge tone={pet.outfit !== "none" ? "blue" : undefined} variant={pet.outfit !== "none" ? "default" : "outline"}>
                {pet.outfitName}
              </Badge>
            </div>
            <div className="mt-4 w-full rounded-md bg-surface-2 p-3 text-left text-xs text-fg-muted">
              <p>
                <strong>Tâm trạng:</strong> {pet.moodLabel} ({pet.moodScore}/5)
              </p>
              <p className="mt-1">
                <strong>Hôm nay:</strong> {pet.today.reviews} lượt ôn · {pet.today.correct} đúng · {pet.today.newLearned} từ mới
              </p>
            </div>
          </div>
        </div>

        {/* Figures grid */}
        <div className="grid gap-3 sm:grid-cols-2 lg:col-span-2">
          {/* Level & XP */}
          <div className="rounded-lg bg-surface p-4 shadow-sm dark:border dark:border-border">
            <div className="flex items-center gap-3">
              <IconTile icon={Sparkles} tone="sun" size={40} />
              <div className="min-w-0 flex-1">
                <p className="font-display text-xl font-extrabold tabular-nums">Cấp {pet.level.level}</p>
                <p className="text-sm text-fg-muted">{pet.totalXp} XP tổng</p>
              </div>
            </div>
            <div className="mt-3">
              <div className="flex justify-between text-xs text-fg-muted">
                <span>{pet.level.xpInLevel} / {pet.level.xpForNext} XP</span>
                <span>{xpPct}%</span>
              </div>
              <div className="mt-1 h-2 w-full overflow-hidden rounded-full bg-surface-3">
                <div
                  className="h-full rounded-full bg-c-sun transition-all"
                  style={{ width: `${Math.min(100, Math.max(0, xpPct))}%` }}
                />
              </div>
            </div>
          </div>

          {/* Bones & Feeding */}
          <div className="rounded-lg bg-surface p-4 shadow-sm dark:border dark:border-border">
            <div className="flex items-center gap-3">
              <IconTile icon={Bone} tone="orange" size={40} />
              <div className="min-w-0">
                <p className="font-display text-xl font-extrabold tabular-nums">{pet.boneBalance} khúc xương</p>
                <p className="text-sm text-fg-muted">Sổ cái thực tế · Đã cho ăn: {pet.treatsFed}</p>
              </div>
            </div>
            <p className="mt-3 text-xs text-fg-muted">
              Hôm nay đã cho ăn:{" "}
              <strong className={pet.fedToday ? "text-success-fg" : "text-fg"}>
                {pet.fedToday ? "Đã cho ăn" : "Chưa"}
              </strong>
            </p>
          </div>

          {/* Postcards & Trips */}
          <div className="rounded-lg bg-surface p-4 shadow-sm dark:border dark:border-border">
            <div className="flex items-center gap-3">
              <IconTile icon={Mail} tone="grape" size={40} />
              <div className="min-w-0">
                <p className="font-display text-xl font-extrabold tabular-nums">{pet.postcardCount} / 24 nơi</p>
                <p className="text-sm text-fg-muted">Bưu thiếp đã sưu tầm</p>
              </div>
            </div>
            <p className="mt-3 text-xs text-fg-muted">
              Chuyến gần nhất:{" "}
              <strong>{pet.latestTrip ? `${pet.latestTrip.placeName} (${pet.latestTrip.status})` : "Chưa đi"}</strong>
            </p>
          </div>

          {/* Streak */}
          <div className="rounded-lg bg-surface p-4 shadow-sm dark:border dark:border-border">
            <div className="flex items-center gap-3">
              <IconTile icon={Flame} tone="sun" size={40} />
              <div className="min-w-0">
                <p className="font-display text-xl font-extrabold tabular-nums">{pet.streak} ngày</p>
                <p className="text-sm text-fg-muted">Dài nhất: {pet.longestStreak} ngày</p>
              </div>
            </div>
            <p className="mt-3 text-xs text-fg-muted">
              {pet.reviewedToday ? "Hôm nay đã duy trì chuỗi" : "Hôm nay chưa học bài nào"}
            </p>
          </div>

          {/* Quests Total */}
          <div className="rounded-lg bg-surface p-4 shadow-sm dark:border dark:border-border">
            <div className="flex items-center gap-3">
              <IconTile icon={Gift} tone="mint" size={40} />
              <div className="min-w-0">
                <p className="font-display text-xl font-extrabold tabular-nums">{pet.questsClaimedTotal} quà</p>
                <p className="text-sm text-fg-muted">Nhiệm vụ đã nhận thưởng</p>
              </div>
            </div>
            <p className="mt-3 text-xs text-fg-muted">Tâm trạng Bin: {pet.moodLabel}</p>
          </div>

          {/* Streak Scarves & Freezes */}
          <div className="rounded-lg bg-surface p-4 shadow-sm dark:border dark:border-border">
            <div className="flex items-center gap-3">
              <IconTile icon={Shield} tone="blue" size={40} />
              <div className="min-w-0">
                <p className="font-display text-xl font-extrabold tabular-nums">{pet.scarves} / 2 khăn</p>
                <p className="text-sm text-fg-muted">Khăn giữ chuỗi sở hữu</p>
              </div>
            </div>
            <p className="mt-3 text-xs text-fg-muted">
              Đóng băng 30 ngày qua:{" "}
              <strong>
                {pet.freezes30.length > 0
                  ? `${pet.freezes30.length} ngày (${pet.freezes30.slice(0, 3).join(", ")}${
                      pet.freezes30.length > 3 ? "..." : ""
                    })`
                  : "Chưa có"}
              </strong>
            </p>
          </div>
        </div>
      </div>

      {/* Daily Greeting */}
      <section className="rounded-lg bg-surface p-5 shadow-sm dark:border dark:border-border">
        <div className="mb-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <MessageSquare className="size-5 text-c-blue" aria-hidden="true" />
            <h3 className="text-lg font-bold">Lời chào hôm nay</h3>
          </div>
          {pet.dailyGreeting && (
            <div className="flex items-center gap-2">
              <Badge tone={pet.dailyGreeting.source === "ai" ? "mint" : "blue"}>
                {pet.dailyGreeting.source === "ai" ? "Trí tuệ nhân tạo (AI)" : "Câu mẫu"}
              </Badge>
              <Badge variant="outline">Tâm trạng: {pet.dailyGreeting.mood}</Badge>
            </div>
          )}
        </div>
        {pet.dailyGreeting ? (
          <div className="rounded-lg border border-border bg-surface-2 p-4">
            <p className="text-base font-medium italic text-fg">
              &ldquo;{pet.dailyGreeting.greeting}&rdquo;
            </p>
            <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-xs text-fg-muted">
              <span>
                {pet.dailyGreeting.wordId
                  ? `Từ vựng ôn tập: ${pet.dailyGreeting.wordId}`
                  : "Không gắn từ cụ thể"}
              </span>
              <span>Tạo lúc: {dateTime(pet.dailyGreeting.createdAt, true)}</span>
            </div>
          </div>
        ) : (
          <p className="text-sm text-fg-muted">
            Chưa tạo lời chào hôm nay (sẽ tạo khi người dùng mở trang Hôm nay).
          </p>
        )}
      </section>

      {/* Wardrobe (8 outfits) */}
      <section className="rounded-lg bg-surface p-5 shadow-sm dark:border dark:border-border">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
          <div>
            <h3 className="text-lg font-bold">Tủ đồ trang phục</h3>
            <p className="text-xs text-fg-muted">
              Đang mặc: <strong className="text-fg">{pet.outfitName}</strong>
            </p>
          </div>
          {pet.nextOutfit && (
            <Badge variant="outline">
              Tiếp theo: {pet.nextOutfit.name} ({pet.nextOutfit.remaining})
            </Badge>
          )}
        </div>

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {OUTFITS.map((o) => {
            const isEquipped = o.id === pet.outfit;
            const isUnlocked = pet.unlocked.includes(o.id);
            const condition = outfitCondition(o);

            return (
              <div
                key={o.id}
                className={`flex flex-col items-center rounded-lg border p-3 text-center transition-colors ${
                  isEquipped
                    ? "border-primary bg-primary/5"
                    : isUnlocked
                      ? "border-border bg-surface-2"
                      : "border-dashed border-border bg-surface/50 opacity-70"
                }`}
              >
                <div className="flex size-14 items-center justify-center">
                  <OutfitIcon outfit={o.id} size={36} />
                </div>
                <p className="mt-2 text-sm font-semibold">{o.name}</p>
                <div className="mt-1.5">
                  {isEquipped ? (
                    <Badge tone="blue">Đang mặc</Badge>
                  ) : isUnlocked ? (
                    <Badge tone="mint">Đã mở</Badge>
                  ) : (
                    <span className="text-xs text-fg-muted">{condition}</span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* Tricks and Today Quests */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Tricks */}
        <section className="rounded-lg bg-surface p-5 shadow-sm dark:border dark:border-border">
          <div className="mb-3 flex items-center gap-2">
            <Zap className="size-5 text-c-sun" aria-hidden="true" />
            <h3 className="text-lg font-bold">Chiêu trò huấn luyện</h3>
          </div>
          <div className="divide-y divide-border">
            {pet.tricks.map((t) => (
              <div key={t.id} className="flex items-center justify-between py-2.5 text-sm">
                <span>{t.name} (cấp {t.level})</span>
                <Badge tone={t.unlocked ? "mint" : undefined} variant={t.unlocked ? "default" : "outline"}>
                  {t.unlocked ? "Đã mở" : "Chưa mở"}
                </Badge>
              </div>
            ))}
          </div>
        </section>

        {/* Quests today */}
        <section className="rounded-lg bg-surface p-5 shadow-sm dark:border dark:border-border">
          <div className="mb-3 flex items-center gap-2">
            <Award className="size-5 text-c-mint" aria-hidden="true" />
            <h3 className="text-lg font-bold">Nhiệm vụ hôm nay</h3>
          </div>
          <div className="space-y-3">
            {pet.quests.map((q) => (
              <div key={q.id} className="rounded-md bg-surface-2 p-3">
                <div className="flex items-center justify-between text-sm">
                  <span className="font-medium">{q.title}</span>
                  {q.claimed ? (
                    <Badge tone="mint">Đã nhận thưởng</Badge>
                  ) : q.done ? (
                    <Badge tone="blue">Chờ nhận</Badge>
                  ) : (
                    <span className="text-xs text-fg-muted">Đang làm</span>
                  )}
                </div>
                <div className="mt-2 flex items-center gap-3">
                  <div className="h-2 flex-1 overflow-hidden rounded-full bg-surface-3">
                    <div
                      className="h-full rounded-full bg-primary"
                      style={{
                        width: `${Math.min(100, Math.round((q.progress / q.target) * 100))}%`,
                      }}
                    />
                  </div>
                  <span className="text-xs text-fg-muted tabular-nums">
                    {q.progress}/{q.target}
                  </span>
                </div>
              </div>
            ))}
            <p className="pt-1 text-xs text-fg-muted">
              Nhiệm vụ &apos;Ôn hết từ đến hạn&apos; cần dữ liệu thẻ đến hạn nên không hiển thị ở đây.
            </p>
          </div>
        </section>
      </div>

      {/* Current Room Layout (6 slots) */}
      <section className="rounded-lg bg-surface p-5 shadow-sm dark:border dark:border-border">
        <div className="mb-4 flex items-center gap-2">
          <Sofa className="size-5 text-c-orange" aria-hidden="true" />
          <h3 className="text-lg font-bold">Phòng của {pet.name} (6 vị trí)</h3>
        </div>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
          {ROOM_SLOTS.map((slot) => {
            const itemId = pet.room[slot];
            const item = itemId ? ITEM_BY_ID.get(itemId) : null;

            return (
              <div
                key={slot}
                className="flex flex-col items-center rounded-lg border border-border bg-surface-2 p-3 text-center"
              >
                <span className="text-xs font-bold text-fg-muted">{SLOT_LABEL[slot]}</span>
                <div className="my-2 flex size-12 items-center justify-center">
                  {itemId ? (
                    <RoomItemIcon id={itemId} size={40} />
                  ) : (
                    <span className="text-xs text-fg-subtle">Trống</span>
                  )}
                </div>
                <span className="truncate text-xs font-semibold text-fg">
                  {item?.name ?? (itemId ? itemId : "(Chưa đặt)")}
                </span>
              </div>
            );
          })}
        </div>
      </section>

      {/* Latest Trip Details */}
      <section className="rounded-lg bg-surface p-5 shadow-sm dark:border dark:border-border">
        <div className="mb-4 flex items-center gap-2">
          <Footprints className="size-5 text-c-grape" aria-hidden="true" />
          <h3 className="text-lg font-bold">Chuyến đi gần nhất</h3>
        </div>
        {pet.latestTrip ? (
          <div className="grid gap-3 sm:grid-cols-4">
            <div className="rounded-md bg-surface-2 p-3">
              <span className="text-xs text-fg-muted">Địa điểm</span>
              <p className="mt-1 font-bold text-fg">{pet.latestTrip.placeName}</p>
              <span className="text-xs text-fg-muted">{pet.latestTrip.placeId}</span>
            </div>
            <div className="rounded-md bg-surface-2 p-3">
              <span className="text-xs text-fg-muted">Trạng thái</span>
              <p className="mt-1">
                <Badge
                  tone={
                    pet.latestTrip.status === "Đã đón"
                      ? "mint"
                      : pet.latestTrip.status.includes("Đã về")
                        ? "blue"
                        : "orange"
                  }
                >
                  {pet.latestTrip.status}
                </Badge>
              </p>
            </div>
            <div className="rounded-md bg-surface-2 p-3">
              <span className="text-xs text-fg-muted">Thời gian về</span>
              <p className="mt-1 text-sm font-semibold text-fg">
                {dateTime(pet.latestTrip.returnsAt, true)}
              </p>
            </div>
            <div className="rounded-md bg-surface-2 p-3">
              <span className="text-xs text-fg-muted">Từ nhặt được</span>
              <p className="mt-1 text-sm font-bold text-fg">
                {pet.latestTrip.wordTerm ?? "(Không có từ)"}
              </p>
            </div>
          </div>
        ) : (
          <p className="text-sm text-fg-muted">Chưa có chuyến đi nào được ghi nhận.</p>
        )}
      </section>

      {/* Bone Ledger (Recent 20 rows) */}
      <section className="rounded-lg bg-surface p-5 shadow-sm dark:border dark:border-border">
        <div className="mb-4 flex items-center gap-2">
          <History className="size-5 text-fg-muted" aria-hidden="true" />
          <h3 className="text-lg font-bold">Sổ cái xương (20 giao dịch gần nhất)</h3>
        </div>
        {pet.ledger.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-border text-xs text-fg-muted">
                  <th className="py-2 pr-4 font-semibold">Thời gian</th>
                  <th className="py-2 pr-4 font-semibold">Ngày học</th>
                  <th className="py-2 pr-4 font-semibold">Loại</th>
                  <th className="py-2 pr-4 font-semibold text-right">Số lượng</th>
                  <th className="py-2 pl-4 font-semibold">Tham chiếu</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {pet.ledger.map((row) => {
                  const info = KIND_INFO[row.kind] ?? { label: row.kind, tone: "neutral" };
                  const isPositive = row.amount > 0;
                  const isZero = row.amount === 0;

                  return (
                    <tr key={row.id} className="hover:bg-surface-2/50">
                      <td className="py-2.5 pr-4 text-xs tabular-nums text-fg-muted">
                        {dateTime(row.created_at, true)}
                      </td>
                      <td className="py-2.5 pr-4 text-xs tabular-nums">{row.study_day}</td>
                      <td className="py-2.5 pr-4">
                        <Badge tone={info.tone}>{info.label}</Badge>
                      </td>
                      <td
                        className={`py-2.5 pr-4 text-right font-mono font-bold tabular-nums ${
                          isPositive ? "text-success-fg" : isZero ? "text-fg-muted" : "text-destructive"
                        }`}
                      >
                        {isPositive ? `+${row.amount}` : row.amount}
                      </td>
                      <td className="py-2.5 pl-4 text-xs text-fg-muted">{row.ref ?? "-"}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-sm text-fg-muted">Chưa có giao dịch sổ cái nào.</p>
        )}
      </section>
    </div>
  );
}
