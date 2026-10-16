import Link from "next/link";
import { BookOpenCheck, Sparkles, Users, Volume2 } from "lucide-react";
import { Logo } from "@/components/brand/logo";
import { PinyinText } from "@/components/zh/pinyin-text";
import { Button } from "@/components/ui/button";

const FEATURES = [
  {
    icon: Sparkles,
    title: "Gõ một từ, AI điền phần còn lại",
    body: "Phiên âm, pinyin, nghĩa, câu ví dụ có dịch, cụm từ, Hán Việt và ảnh minh họa.",
  },
  {
    icon: BookOpenCheck,
    title: "Biết chính xác hôm nay cần ôn gì",
    body: "Lịch ôn ngắt quãng FSRS nhắc đúng những từ bạn sắp quên.",
  },
  {
    icon: Volume2,
    title: "Nghe, gõ, viết chữ Hán, luyện thanh điệu",
    body: "Nhiều kiểu luyện cho cả tiếng Anh và tiếng Trung.",
  },
  {
    icon: Users,
    title: "Học cùng bạn bè",
    body: "Chia sẻ bộ từ bằng link, lập nhóm có mã mời và bảng xếp hạng tuần.",
  },
];

export default function MarketingPage() {
  return (
    <div className="mx-auto flex w-full max-w-5xl flex-1 flex-col px-4 pb-16 sm:px-6">
      <header className="flex items-center justify-between py-4">
        <Logo />
        <Button asChild variant="ghost" className="min-h-11 rounded-[10px] px-4 text-base">
          <Link href="/login">Đăng nhập</Link>
        </Button>
      </header>

      <section className="grid items-center gap-10 pt-8 md:grid-cols-[1.1fr_1fr] md:pt-16">
        <div>
          <h1 className="text-[2.25rem] leading-[1.15] font-bold tracking-tight text-ink sm:text-[2.75rem]">
            Cuốn vở từ vựng biết nhắc bạn ôn bài
          </h1>
          <p className="mt-4 max-w-md text-base text-ink-soft">
            Ghi từ tiếng Anh, tiếng Trung như ghi vở. Sổ Từ lo phần nhớ giúp bạn: mỗi ngày
            chỉ ôn đúng những từ <span className="highlighter text-ink">sắp quên</span>.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Button asChild className="min-h-12 rounded-[10px] px-6 text-base">
              <Link href="/login">Bắt đầu ghi từ</Link>
            </Button>
            <Button asChild variant="outline" className="min-h-12 rounded-[10px] px-6 text-base">
              <Link href="#tinh-nang">Xem tính năng</Link>
            </Button>
          </div>
        </div>

        <div className="relative mx-auto w-full max-w-sm">
          <div className="notebook-card -rotate-1 p-6 pr-5">
            <p className="text-sm text-ink-soft">Hôm nay cần ôn</p>
            <p className="mt-1 text-[3rem] leading-none font-bold text-ink">
              <span className="highlighter highlighter-animate">24</span>
              <span className="ml-2 text-lg font-medium text-ink-soft">từ</span>
            </p>
          </div>

          <div className="notebook-card mt-4 rotate-[0.6deg] px-6 py-7">
            <div className="flex items-start justify-between gap-3">
              <span className="text-3xl" aria-hidden>
                🌱
              </span>
              <span className="rounded-full bg-wash-blue px-2.5 py-0.5 text-xs font-medium text-ink-blue">
                Tính từ
              </span>
            </div>
            <p className="mt-3">
              <span className="ruled-word text-[2.5rem] leading-tight font-bold text-ink">
                resilient
              </span>
            </p>
            <p className="mt-2 font-ipa text-ink-soft">/rɪˈzɪliənt/</p>
            <p className="mt-3 text-ink">kiên cường, mau phục hồi</p>
          </div>

          <div className="notebook-card mt-4 -rotate-[0.4deg] px-6 py-6">
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
        <h2 className="text-xl font-bold text-ink">Thay cuốn tập ghi từ vựng</h2>
        <ul className="ruled-list mt-6 border-y border-rule">
          {FEATURES.map(({ icon: Icon, title, body }) => (
            <li key={title} className="flex gap-4 py-5">
              <span className="mt-0.5 grid size-10 shrink-0 place-items-center rounded-[10px] bg-wash-blue text-ink-blue">
                <Icon className="size-5" aria-hidden />
              </span>
              <div>
                <h3 className="font-medium text-ink">{title}</h3>
                <p className="mt-1 text-sm text-ink-soft">{body}</p>
              </div>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
