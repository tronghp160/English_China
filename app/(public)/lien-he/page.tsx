import { Bug, Check, Lightbulb, MessageCircle, Sparkles, type LucideIcon } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { FacebookIcon, ZaloIcon } from "@/components/contact/contact-links";
import { CopyPhone } from "@/components/contact/copy-phone";
import { Pup } from "@/components/mascot/pup";
import { IconTile } from "@/components/ui/icon-tile";
import { CONTACT, formatPhone, zaloUrl } from "@/lib/contact";
import { TONE_CLASSES, type Tone } from "@/lib/tone";
import { cn } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Liên hệ",
  description: "Góp ý, báo lỗi hoặc hỏi về Sổ Từ: nhắn Xễu Đùng Đùng qua Facebook và Zalo.",
};

const TOPICS: { icon: LucideIcon; tone: Tone; title: string; text: string }[] = [
  { icon: Bug, tone: "coral", title: "Báo lỗi", text: "Trang nào không chạy, nút nào bấm không được." },
  { icon: Lightbulb, tone: "sun", title: "Góp ý", text: "Tính năng bạn muốn có, chỗ nào khó dùng." },
  { icon: Sparkles, tone: "mint", title: "Hỏi chuyện học", text: "Xin bộ từ mẫu, hỏi cách học, rủ học chung nhóm." },
];

const BUG_REPORT = [
  "Trang bạn đang mở (ví dụ: Luyện tập, chế độ Học)",
  "Bạn đã bấm gì, và thấy gì xảy ra",
  "Ảnh chụp màn hình, hoặc nội dung lỗi nếu có",
  "Bạn dùng điện thoại hay máy tính, trình duyệt nào",
];

export default function ContactPage() {
  const phone = formatPhone(CONTACT.zaloPhone);
  return (
    <div className="flex flex-col gap-8 py-4">
      <section className="relative overflow-hidden rounded-xl bg-primary p-6 text-on-primary shadow-hero sm:p-8">
        <span aria-hidden className="absolute -top-16 -right-10 size-56 rounded-full bg-primary-lift" />
        <span aria-hidden className="absolute -bottom-20 -left-12 size-44 rounded-full bg-primary-deep" />
        <div className="relative flex flex-col gap-4 sm:flex-row sm:items-center">
          <div className="min-w-0 flex-1">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-white/16 px-3 py-1 text-sm font-bold">
              <MessageCircle className="size-4" aria-hidden />
              Liên hệ
            </span>
            <h1 className="mt-3 text-[1.875rem] leading-tight sm:text-[2.25rem]">Chào bạn, mình là {CONTACT.nickname}</h1>
            <p className="mt-2 max-w-[44ch] text-[1.0625rem] leading-relaxed opacity-95">
              Mình làm Sổ Từ để học tiếng Anh và tiếng Trung. Có gì cần, bạn cứ nhắn qua Messenger hoặc Zalo, mình sẽ trả lời
              sớm nhất có thể.
            </p>
          </div>
          <div className="self-center sm:self-end">
            <Pup mood="wave" size={128} />
          </div>
        </div>
      </section>

      <section aria-labelledby="contact-channels">
        <h2 id="contact-channels" className="mb-3 text-lg">
          Nhắn cho mình
        </h2>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="flex flex-col gap-4 rounded-lg bg-c-blue-soft p-5 text-c-blue-fg">
            <div className="flex items-center gap-3">
              <span className="grid size-12 shrink-0 place-items-center rounded-md bg-c-blue text-white">
                <FacebookIcon className="size-6" />
              </span>
              <div className="min-w-0">
                <p className="text-lg font-extrabold">Messenger</p>
                <p className="text-sm">Facebook của {CONTACT.nickname}</p>
              </div>
            </div>
            <a
              href={CONTACT.facebook}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex min-h-12 items-center justify-center rounded-md bg-primary px-4 font-bold text-on-primary shadow-sm transition-transform hover:-translate-y-0.5"
            >
              Nhắn qua Messenger<span className="sr-only"> (mở trong tab mới)</span>
            </a>
          </div>
          <div className="flex flex-col gap-4 rounded-lg bg-c-teal-soft p-5 text-c-teal-fg">
            <div className="flex items-center gap-3">
              <span className="grid size-12 shrink-0 place-items-center rounded-md bg-surface text-c-teal-fg">
                <ZaloIcon className="h-6 w-9" />
              </span>
              <div className="min-w-0">
                <p className="text-lg font-extrabold">Zalo</p>
                <p className="text-sm tabular-nums">{phone}</p>
              </div>
            </div>
            <div className="flex gap-2">
              <a
                href={zaloUrl(CONTACT.zaloPhone)}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex min-h-12 flex-1 items-center justify-center rounded-md bg-c-teal-fg px-4 font-bold text-surface shadow-sm transition-transform hover:-translate-y-0.5"
              >
                Nhắn qua Zalo<span className="sr-only"> (mở trong tab mới)</span>
              </a>
              <CopyPhone phone={CONTACT.zaloPhone} display={phone} className="min-h-12" />
            </div>
          </div>
        </div>
        <p className="mt-3 text-sm text-fg-muted">Hoặc bấm nút chat tròn ở góc dưới bên phải, ở trang nào cũng có.</p>
      </section>

      <section aria-labelledby="contact-topics">
        <h2 id="contact-topics" className="mb-3 text-lg">
          Bạn có thể nhắn về
        </h2>
        <ul className="grid gap-3 sm:grid-cols-3">
          {TOPICS.map((t) => (
            <li key={t.title} className="flex gap-3 rounded-lg bg-surface p-4 shadow-sm sm:flex-col dark:border dark:border-border">
              <IconTile icon={t.icon} tone={t.tone} size={44} solid />
              <div className="min-w-0">
                <p className={cn("font-extrabold", TONE_CLASSES[t.tone].fg)}>{t.title}</p>
                <p className="text-sm text-fg-muted">{t.text}</p>
              </div>
            </li>
          ))}
        </ul>
      </section>

      <section aria-labelledby="contact-bug" className="rounded-lg bg-streak-soft p-5 text-streak-fg">
        <h2 id="contact-bug" className="text-lg">
          Khi báo lỗi, gửi kèm giúp mình
        </h2>
        <ul className="mt-3 flex flex-col gap-2">
          {BUG_REPORT.map((b) => (
            <li key={b} className="flex items-start gap-2.5">
              <span className="mt-0.5 grid size-5 shrink-0 place-items-center rounded-full bg-c-sun text-c-sun-on">
                <Check className="size-3.5" strokeWidth={3} aria-hidden />
              </span>
              <span className="text-fg">{b}</span>
            </li>
          ))}
        </ul>
      </section>

      <section aria-labelledby="privacy-note" className="rounded-lg bg-surface p-5 shadow-sm text-sm dark:border dark:border-border">
        <h2 id="privacy-note" className="text-base font-bold text-fg mb-1">
          Quyền riêng tư & Quản lý dữ liệu
        </h2>
        <p className="text-fg-muted">
          Quản trị viên Sổ Từ có thể xem dữ liệu học tập của bạn (bộ từ, ghi chú, lịch sử ôn, trò chuyện với gia sư) để hỗ trợ và quản lý. Bạn có thể tải hoặc xóa toàn bộ dữ liệu trong Cài đặt.
        </p>
        <Link href="/quyen-rieng-tu" className="inline-block mt-2 font-medium text-primary hover:underline">
          Xem chính sách quyền riêng tư chi tiết →
        </Link>
      </section>
    </div>
  );
}
