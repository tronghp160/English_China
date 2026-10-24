import Image from "next/image";
import Link from "next/link";
import { Plus } from "lucide-react";
import { Logo } from "@/components/brand/logo";
import { ChatWidget } from "@/components/contact/chat-widget";
import { ContactLinks } from "@/components/contact/contact-links";
import { FeatureBento } from "@/components/marketing/feature-bento";
import { HeroSpecimen } from "@/components/marketing/hero-specimen";
import { Pup } from "@/components/mascot/pup";
import { Button } from "@/components/ui/button";
import { CONTACT } from "@/lib/contact";
import { TONE_CLASSES, type Tone } from "@/lib/tone";
import { cn } from "@/lib/utils";

const STEPS: { title: string; body: string; src: string; alt: string; w: number; h: number; tone: Tone }[] = [
  {
    title: "Ghi từ",
    body: "Gõ một từ, Sổ Từ gợi ý phiên âm, nghĩa và câu ví dụ. Bạn xem lại, sửa nếu cần, rồi lưu.",
    src: "/landing/word-form.webp",
    alt: "Form thêm từ resilient với phiên âm, nghĩa và các nghĩa gợi ý đã được điền",
    w: 960,
    h: 1240,
    tone: "blue",
  },
  {
    title: "Ôn mỗi sáng",
    body: "Mỗi ngày chỉ ôn những từ sắp quên. Lật thẻ, chọn Quên, Khó, Nhớ hay Dễ, lịch ôn tự dời theo bạn.",
    src: "/landing/review.webp",
    alt: "Mặt sau thẻ ôn với nghĩa tiếng Việt và bốn nút đánh giá Quên, Khó, Nhớ, Dễ",
    w: 960,
    h: 1520,
    tone: "mint",
  },
  {
    title: "Luyện theo cách bạn thích",
    body: "Học theo vòng, làm bài kiểm tra, ghép thẻ, nghe, gõ, và tập viết chữ Hán nét theo nét.",
    src: "/landing/modes.webp",
    alt: "Danh sách các chế độ luyện tập: Học, Kiểm tra, Ghép thẻ, Lật thẻ và các kỹ năng riêng",
    w: 896,
    h: 1424,
    tone: "grape",
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

export default function MarketingPage() {
  return (
    <div className="flex flex-1 flex-col overflow-x-clip">
      <header className="sticky top-0 z-30 bg-canvas/80 backdrop-blur-xl">
        <div className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between gap-2 px-4 sm:px-6">
          <Logo />
          <nav className="flex items-center gap-1" aria-label="Tài khoản">
            <Button asChild variant="ghost">
              <Link href="/login">Đăng nhập</Link>
            </Button>
            <Button asChild className="hidden sm:inline-flex">
              <Link href="/signup">Đăng ký</Link>
            </Button>
          </nav>
        </div>
      </header>

      <div className="mx-auto flex w-full max-w-6xl flex-1 flex-col px-4 pb-12 sm:px-6">
        <section className="grid items-center gap-12 pt-8 md:grid-cols-[1.1fr_1fr] md:pt-16">
          <div>
            <h1 className="text-[clamp(2.25rem,5vw,3.75rem)] leading-[1.05] tracking-[-0.035em]">
              Học từ vựng Anh – Trung, nhớ lâu mà nhẹ nhàng.
            </h1>
            <p className="mt-5 max-w-[56ch] text-lg text-fg-muted">
              Sổ từ vựng tiếng Anh và tiếng Trung. Gõ một từ, app điền nghĩa, phiên âm và ví dụ; mỗi ngày bạn chỉ ôn những từ sắp quên.
            </p>
            <div className="mt-8 flex flex-col items-start gap-3 sm:flex-row sm:items-center sm:gap-6">
              <Button asChild variant="pressable" size="lg">
                <Link href="/signup">Tạo sổ miễn phí</Link>
              </Button>
              <Link href="/login" className="inline-flex min-h-11 items-center font-semibold text-primary-fg underline-offset-4 hover:underline">
                Tôi đã có tài khoản
              </Link>
            </div>
          </div>
          <HeroSpecimen />
        </section>

        <section className="mt-24 md:mt-32" aria-labelledby="features-title">
          <h2 id="features-title" className="text-[1.75rem] sm:text-[2.25rem]">
            Mọi thứ để nhớ từ lâu hơn
          </h2>
          <div className="mt-8">
            <FeatureBento />
          </div>
        </section>

        <section className="mt-24 md:mt-32" aria-labelledby="day-title">
          <h2 id="day-title" className="text-[1.75rem] sm:text-[2.25rem]">
            Một ngày với Sổ Từ
          </h2>
          <ol className="mt-8 grid gap-4 md:grid-cols-3">
            {STEPS.map((s, i) => (
              <li key={s.title} className="flex flex-col gap-5 rounded-xl border border-border/60 bg-surface p-6 shadow-sm dark:border-border">
                <div className="flex items-center gap-3">
                  <span
                    aria-hidden
                    className={cn("grid size-10 place-items-center rounded-full font-display text-lg text-white", TONE_CLASSES[s.tone].solid)}
                  >
                    {i + 1}
                  </span>
                  <h3 className="text-lg">{s.title}</h3>
                </div>
                <p className="text-fg-muted">{s.body}</p>
                <div className="mt-auto overflow-hidden rounded-[1.75rem] border-[6px] border-fg bg-fg">
                  <Image
                    src={s.src}
                    alt={s.alt}
                    width={s.w}
                    height={s.h}
                    sizes="(min-width: 768px) 320px, 100vw"
                    className="max-h-[26rem] w-full rounded-[1.25rem] bg-canvas object-cover object-top"
                  />
                </div>
              </li>
            ))}
          </ol>
        </section>

        <section className="mt-24 md:mt-32" aria-labelledby="faq-title">
          <h2 id="faq-title" className="text-[1.75rem] sm:text-[2.25rem]">
            Câu hỏi thường gặp
          </h2>
          <div className="mt-6 flex max-w-3xl flex-col gap-3">
            {FAQ.map((f) => (
              <details key={f.q} className="group rounded-lg border border-border/60 bg-surface px-5 shadow-sm dark:border-border">
                <summary className="flex min-h-14 cursor-pointer list-none items-center justify-between gap-4 font-bold">
                  {f.q}
                  <Plus aria-hidden className="size-5 shrink-0 text-fg-muted transition-transform group-open:rotate-45" />
                </summary>
                <p className="pb-5 text-fg-muted">{f.a}</p>
              </details>
            ))}
          </div>
        </section>

        <section className="relative mt-24 overflow-hidden rounded-xl bg-primary p-8 text-on-primary shadow-hero md:mt-32 md:p-12">
          <div className="max-w-[28rem]">
            <p className="font-display text-[1.75rem] leading-tight sm:text-[2.25rem]">Sổ của bạn đang trống.</p>
            <p className="mt-3 opacity-90">Tạo tài khoản mất chưa tới một phút, không cần xác nhận email.</p>
            <Button asChild variant="white" size="lg" className="mt-6 shadow-[0_4px_0_0_var(--primary-press)]">
              <Link href="/signup">Tạo sổ miễn phí</Link>
            </Button>
          </div>
          <Pup mood="cheer" size={150} className="absolute right-6 -bottom-4 hidden sm:block" />
        </section>

        <footer className="mt-16 flex flex-col gap-4 border-t border-border pt-6 text-sm text-fg-muted sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-col gap-2">
            <Logo className="scale-90 self-start" />
            <p>
              © {new Date().getFullYear()} Sổ Từ, làm bởi {CONTACT.nickname}.{" "}
              <Link href="/lien-he" className="font-semibold text-primary-fg underline underline-offset-4">
                Liên hệ
              </Link>
            </p>
          </div>
          <ContactLinks compact />
        </footer>
      </div>
      <ChatWidget />
    </div>
  );
}
