import Image from "next/image";
import Link from "next/link";
import { Logo } from "@/components/brand/logo";
import { ContactLinks } from "@/components/contact/contact-links";
import { HeroSpecimen } from "@/components/marketing/hero-specimen";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CONTACT } from "@/lib/contact";

const STEPS = [
  {
    title: "Ghi từ",
    body: "Gõ một từ, Sổ Từ gợi ý phiên âm, nghĩa và câu ví dụ. Bạn xem lại, sửa nếu cần, rồi lưu.",
    src: "/landing/word-form.webp",
    alt: "Form thêm từ resilient với phiên âm, nghĩa và các nghĩa gợi ý đã được điền",
    w: 960,
    h: 1240,
  },
  {
    title: "Ôn mỗi sáng",
    body: "Mỗi ngày chỉ ôn những từ sắp quên. Lật thẻ, chọn Quên, Khó, Nhớ hay Dễ, lịch ôn tự dời theo bạn.",
    src: "/landing/review.webp",
    alt: "Mặt sau thẻ ôn với nghĩa tiếng Việt và bốn nút đánh giá Quên, Khó, Nhớ, Dễ",
    w: 960,
    h: 1520,
  },
  {
    title: "Luyện theo cách bạn thích",
    body: "Học theo vòng, làm bài kiểm tra, ghép thẻ, nghe, gõ, và tập viết chữ Hán nét theo nét.",
    src: "/landing/modes.webp",
    alt: "Danh sách các chế độ luyện tập: Học, Kiểm tra, Ghép thẻ, Lật thẻ và các kỹ năng riêng",
    w: 896,
    h: 1424,
  },
];

const FAQ = [
  {
    q: "Sổ Từ có miễn phí không?",
    a: "Có. Bạn đăng ký bằng email và dùng đủ mọi chức năng, không cần thẻ thanh toán.",
  },
  {
    q: "Dữ liệu của tôi được lưu ở đâu?",
    a: "Trên máy chủ gắn với tài khoản của bạn. Trong Cài đặt, bạn tải toàn bộ dữ liệu về (JSON hoặc CSV) hoặc xóa tài khoản bất cứ lúc nào.",
  },
  {
    q: "Có dùng offline được không?",
    a: "Một phần. Kết quả ôn lúc mất mạng được lưu trên máy và tự gửi lại khi có mạng. Các trang vẫn cần mạng để tải.",
  },
  {
    q: "Cài lên điện thoại thế nào?",
    a: "Mở Sổ Từ bằng Chrome (Android) hoặc Safari (iPhone), chọn “Thêm vào màn hình chính”. Sổ Từ sẽ mở như một ứng dụng riêng.",
  },
];

const BOARD = [
  { rank: 1, name: "Lan", xp: 320, streak: 14 },
  { rank: 2, name: "Minh", xp: 290, streak: 0 },
  { rank: 3, name: "Trọng", xp: 210, streak: 5, me: true },
];

export default function MarketingPage() {
  return (
    <div className="mx-auto flex w-full max-w-5xl flex-1 flex-col overflow-x-clip px-4 pb-12 sm:px-6">
      <header className="flex items-center justify-between gap-2 py-4">
        <Logo />
        <nav className="flex items-center gap-1" aria-label="Tài khoản">
          <Button asChild variant="ghost">
            <Link href="/login">Đăng nhập</Link>
          </Button>
          <Button asChild className="hidden sm:inline-flex">
            <Link href="/signup">Đăng ký</Link>
          </Button>
        </nav>
      </header>

      <section className="grid items-center gap-12 pt-8 md:grid-cols-[1.15fr_1fr] md:pt-16">
        <div>
          <h1 className="font-display text-[clamp(2.25rem,4.4vw,3.25rem)] leading-[1.08] font-semibold tracking-tight">
            Ghi từ như ghi vở.
            <br />
            Ôn đúng lúc sắp quên.
          </h1>
          <p className="mt-5 max-w-[62ch] text-lg text-fg-muted">
            Sổ từ vựng tiếng Anh và tiếng Trung. Gõ một từ, app điền nghĩa, phiên âm và ví dụ; mỗi ngày bạn chỉ ôn những từ sắp quên.
          </p>
          <div className="mt-8 flex flex-col items-start gap-3 sm:flex-row sm:items-center sm:gap-6">
            <Button asChild size="lg">
              <Link href="/signup">Tạo sổ miễn phí</Link>
            </Button>
            <Link href="/login" className="inline-flex min-h-11 items-center text-primary underline-offset-4 hover:underline">
              Tôi đã có tài khoản
            </Link>
          </div>
        </div>
        <HeroSpecimen />
      </section>

      <section className="mt-24 md:mt-32" aria-labelledby="day-title">
        <h2 id="day-title" className="text-xl sm:text-2xl">
          Một ngày với Sổ Từ
        </h2>
        <ol className="mt-10 space-y-16 md:space-y-20">
          {STEPS.map((s, i) => (
            <li key={s.title} className="grid items-center gap-6 md:grid-cols-2 md:gap-12">
              <div className={i % 2 ? "md:order-2" : undefined}>
                <p className="font-display text-3xl font-semibold text-primary tabular-nums">{i + 1}</p>
                <h3 className="mt-1 text-lg">{s.title}</h3>
                <p className="mt-2 max-w-[48ch] text-fg-muted">{s.body}</p>
              </div>
              <Image
                src={s.src}
                alt={s.alt}
                width={s.w}
                height={s.h}
                sizes="(min-width: 768px) 480px, 100vw"
                className="mx-auto max-h-[34rem] w-auto max-w-full rounded-lg border border-border object-contain object-top"
              />
            </li>
          ))}
        </ol>
      </section>

      <section className="mt-24 grid items-center gap-8 md:mt-32 md:grid-cols-2 md:gap-12" aria-labelledby="friends-title">
        <div>
          <h2 id="friends-title" className="text-xl sm:text-2xl">
            Học cùng bạn bè
          </h2>
          <p className="mt-3 max-w-[48ch] text-fg-muted">
            Chia sẻ bộ từ bằng một đường link. Lập nhóm có mã mời, mỗi người giữ tiến độ riêng và so điểm XP trên bảng xếp hạng tuần.
          </p>
        </div>
        <div>
          <p className="flex items-baseline justify-between text-sm text-fg-muted">
            <span className="font-medium text-fg">Tuần này</span>
            <span>Ví dụ</span>
          </p>
          <ol className="divide-y divide-border mt-2 border-y border-border" aria-label="Bảng xếp hạng mẫu">
            {BOARD.map((r) => (
              <li key={r.rank} className={`flex min-h-14 items-center gap-3 px-2 py-2 ${r.me ? "bg-primary-soft" : ""}`}>
                <span className="w-6 text-center font-display text-xl font-semibold text-fg-muted tabular-nums">{r.rank}</span>
                <span className="min-w-0 flex-1">
                  <span className="flex items-center gap-2 font-medium">
                    {r.name}
                    {r.me && <span className="font-normal text-fg-muted">(bạn)</span>}
                    {r.rank === 1 && <Badge variant="soft" tone="sun">Nhất</Badge>}
                  </span>
                  {r.streak > 0 && <span className="text-xs text-fg-muted">chuỗi {r.streak} ngày</span>}
                </span>
                <span className="font-display text-lg font-semibold tabular-nums">
                  {r.xp} <span className="font-sans text-xs font-normal text-fg-muted">XP</span>
                </span>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section className="mt-24 md:mt-32" aria-labelledby="faq-title">
        <h2 id="faq-title" className="text-xl sm:text-2xl">
          Câu hỏi thường gặp
        </h2>
        <div className="mt-6 max-w-2xl divide-y divide-border border-y border-border">
          {FAQ.map((f) => (
            <details key={f.q} className="group py-1">
              <summary className="flex min-h-12 cursor-pointer list-none items-center justify-between gap-4 font-medium">
                {f.q}
                <span aria-hidden className="text-xl text-fg-muted transition-transform group-open:rotate-45">
                  +
                </span>
              </summary>
              <p className="pb-4 text-fg-muted">{f.a}</p>
            </details>
          ))}
        </div>
      </section>

      <section className="rounded-lg border border-border/60 bg-surface shadow-sm mt-24 overflow-hidden md:mt-32">
        <div className="py-10 pr-6 pl-6">
          <p className="font-display text-2xl font-semibold sm:text-3xl">Sổ của bạn đang trống.</p>
          <p className="mt-3 text-fg-muted">Tạo tài khoản mất chưa tới một phút, không cần xác nhận email.</p>
          <Button asChild size="lg" className="mt-6">
            <Link href="/signup">Tạo sổ miễn phí</Link>
          </Button>
        </div>
      </section>

      <footer className="mt-16 flex flex-col gap-4 border-t border-border pt-6 text-sm text-fg-muted sm:flex-row sm:items-center sm:justify-between">
        <p>
          © {new Date().getFullYear()} Sổ Từ, làm bởi {CONTACT.nickname}.{" "}
          <Link href="/lien-he" className="text-primary underline underline-offset-4">
            Liên hệ
          </Link>
        </p>
        <ContactLinks compact />
      </footer>
    </div>
  );
}
