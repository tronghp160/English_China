import Link from "next/link";
import { ArrowRight, BookOpenCheck, Sparkles, Users, Volume2 } from "lucide-react";
import { Logo } from "@/components/brand/logo";
import { ContactLinks } from "@/components/contact/contact-links";
import { PinyinText } from "@/components/zh/pinyin-text";
import { Button, buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const FEATURES = [
  {
    icon: Sparkles,
    tile: "bg-wash-yellow text-sun-text",
    title: "Gõ một từ, AI điền phần còn lại",
    body: "Phiên âm, pinyin, nghĩa, câu ví dụ có dịch, cụm từ, Hán Việt và ảnh minh họa.",
  },
  {
    icon: BookOpenCheck,
    tile: "bg-wash-jade text-jade-text",
    title: "Biết chính xác hôm nay cần ôn gì",
    body: "Lịch ôn ngắt quãng FSRS nhắc đúng những từ bạn sắp quên.",
  },
  {
    icon: Volume2,
    tile: "bg-wash-sky text-sky-text",
    title: "Nghe, gõ, viết chữ Hán, luyện thanh điệu",
    body: "Nhiều kiểu luyện cho cả tiếng Anh và tiếng Trung.",
  },
  {
    icon: Users,
    tile: "bg-wash-pink text-pink-text",
    title: "Học cùng bạn bè",
    body: "Chia sẻ bộ từ bằng link, lập nhóm có mã mời và đua XP trên bảng xếp hạng tuần.",
  },
];

const STEPS = [
  { emoji: "✍️", title: "Ghi từ", body: "Gõ từ mới, AI lo phần nghĩa và ví dụ." },
  { emoji: "🧠", title: "Ôn 10 phút mỗi ngày", body: "Lật thẻ, chọn Nhớ hay Quên — app tự xếp lịch." },
  { emoji: "🔥", title: "Giữ chuỗi, nhận XP", body: "Thi đua cùng bạn bè, đừng để lửa tắt!" },
];

export default function MarketingPage() {
  return (
    <div className="mx-auto flex w-full max-w-5xl flex-1 flex-col overflow-x-clip px-4 pb-16 sm:px-6">
      <header className="flex items-center justify-between gap-2 py-4">
        <Logo />
        <nav className="flex items-center gap-1">
          <Button asChild variant="ghost" className="min-h-11 px-3 text-base">
            <Link href="/login">Đăng nhập</Link>
          </Button>
          <Button asChild className="hidden min-h-11 px-4 text-base sm:inline-flex">
            <Link href="/signup">Đăng ký</Link>
          </Button>
        </nav>
      </header>

      <section className="grid items-center gap-12 pt-6 md:grid-cols-[1.1fr_1fr] md:pt-14">
        <div>
          <p className="inline-flex items-center gap-2 rounded-full bg-wash-yellow px-3 py-1 text-sm font-bold text-sun-text">
            <span aria-hidden>🎉</span> Miễn phí · Tiếng Anh & Tiếng Trung
          </p>
          <h1 className="mt-4 text-[2.5rem] leading-[1.1] text-ink sm:text-[3.25rem]">
            Học từ vựng <span className="highlighter highlighter-animate">vui</span> như chơi game
          </h1>
          <p className="mt-4 max-w-md text-base text-ink-soft">
            Ghi từ như ghi vở, Sổ Từ lo phần nhớ giúp bạn: mỗi ngày chỉ ôn đúng những từ sắp quên — có chuỗi ngày,
            XP và bảng xếp hạng cùng bạn bè.
          </p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Link href="/signup" className={cn(buttonVariants(), "h-14 gap-2 px-7 text-lg font-extrabold")}>
              Bắt đầu miễn phí
              <ArrowRight className="size-5" aria-hidden />
            </Link>
            <Link href="/login" className={cn(buttonVariants({ variant: "outline" }), "h-14 px-7 text-lg")}>
              Tôi đã có tài khoản
            </Link>
          </div>
        </div>

        <div className="relative mx-auto w-full max-w-sm pt-4">
          <span
            aria-hidden
            className="absolute -top-3 -left-4 z-10 rotate-[-8deg] rounded-full bg-surface px-3 py-1.5 font-heading font-black text-sun-text shadow-pop"
          >
            <span className="inline-block animate-wiggle">🔥</span> 12 ngày
          </span>
          <span
            aria-hidden
            className="absolute top-40 -right-3 z-10 rotate-6 animate-float rounded-full bg-highlight px-3 py-1.5 font-heading font-black text-ink shadow-pop"
          >
            +30 XP ⭐
          </span>

          <div className="hero-gradient rotate-1 rounded-sheet p-6 shadow-pop">
            <p className="text-sm font-semibold text-white/80">Hôm nay cần ôn</p>
            <p className="mt-1 font-heading text-[3.5rem] leading-none font-black">
              24<span className="ml-2 text-xl font-extrabold">từ</span>
            </p>
            <span className="mt-4 flex min-h-11 items-center justify-center rounded-btn bg-white font-extrabold text-brand shadow-[0_4px_0_0_rgb(0_0_0/0.2)]">
              ▶ Bắt đầu ôn
            </span>
          </div>

          <div className="notebook-card mt-4 -rotate-2 px-6 py-6">
            <div className="flex items-start justify-between gap-3">
              <span className="text-4xl" aria-hidden>
                🌱
              </span>
              <span className="rounded-full bg-wash-jade px-2.5 py-0.5 text-xs font-bold text-jade-text">Tính từ</span>
            </div>
            <p className="mt-2">
              <span className="ruled-word font-heading text-[2.5rem] leading-tight font-black text-ink">resilient</span>
            </p>
            <p className="mt-2 font-ipa text-ink-soft">/rɪˈzɪliənt/</p>
            <p className="mt-2 font-semibold text-ink">kiên cường, mau phục hồi</p>
          </div>

          <div className="notebook-card mt-4 rotate-1 px-6 py-5">
            <div className="flex items-baseline gap-4">
              <span lang="zh-CN" className="font-hanzi text-[2.75rem] leading-none font-bold text-ink">
                坚强
              </span>
              <div>
                <PinyinText pinyin="jiānqiáng" className="text-lg font-medium" />
                <p className="text-sm text-ink-soft">kiên cường</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section id="tinh-nang" className="mt-20 md:mt-28">
        <h2 className="text-xl text-ink">Mọi thứ để thuộc từ thật lâu</h2>
        <ul className="mt-6 grid gap-4 sm:grid-cols-2">
          {FEATURES.map(({ icon: Icon, tile, title, body }) => (
            <li key={title} className="notebook-card flex gap-4 p-5">
              <span className={cn("icon-tile size-12", tile)}>
                <Icon className="size-6" aria-hidden />
              </span>
              <div>
                <h3 className="text-base text-ink">{title}</h3>
                <p className="mt-1 text-sm text-ink-soft">{body}</p>
              </div>
            </li>
          ))}
        </ul>
      </section>

      <section className="mt-16">
        <h2 className="text-xl text-ink">Chỉ 3 bước</h2>
        <ol className="mt-6 grid gap-4 sm:grid-cols-3">
          {STEPS.map((s, i) => (
            <li key={s.title} className="relative rounded-card bg-surface p-5 shadow-card">
              <span className="absolute top-4 right-4 grid size-8 place-items-center rounded-full bg-ink-blue font-heading font-black text-primary-foreground">
                {i + 1}
              </span>
              <span aria-hidden className="text-4xl">
                {s.emoji}
              </span>
              <h3 className="mt-3 text-base text-ink">{s.title}</h3>
              <p className="mt-1 text-sm text-ink-soft">{s.body}</p>
            </li>
          ))}
        </ol>
      </section>

      <section className="hero-gradient mt-16 flex flex-col items-center rounded-sheet px-6 py-10 text-center shadow-pop">
        <span aria-hidden className="animate-float text-5xl">
          🚀
        </span>
        <h2 className="mt-3 text-xl">Sẵn sàng ghi từ đầu tiên?</h2>
        <p className="mt-1 text-white/85">Tạo tài khoản trong 30 giây, không cần xác nhận email.</p>
        <Link
          href="/signup"
          className="btn-3d mt-6 inline-flex min-h-14 items-center gap-2 rounded-btn bg-white px-7 text-lg font-extrabold text-brand [--edge-color:rgb(0_0_0/0.2)]"
        >
          Đăng ký miễn phí
          <ArrowRight className="size-5" aria-hidden />
        </Link>
      </section>

      <footer className="mt-16 flex flex-col gap-4 border-t border-rule pt-8 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="font-heading text-lg font-black text-ink">Liên hệ với mình</p>
          <p className="text-sm text-ink-soft">
            Góp ý, báo lỗi hay muốn học cùng?{" "}
            <Link href="/lien-he" className="font-semibold text-ink-blue underline-offset-2 hover:underline">
              Xem trang liên hệ
            </Link>
          </p>
        </div>
        <ContactLinks compact />
      </footer>
    </div>
  );
}
