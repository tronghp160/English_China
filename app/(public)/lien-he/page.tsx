import type { Metadata } from "next";
import { ContactLinks } from "@/components/contact/contact-links";

export const metadata: Metadata = {
  title: "Liên hệ",
  description: "Góp ý, báo lỗi hoặc hỏi về Sổ Từ qua Facebook và Zalo.",
};

const TOPICS = [
  { emoji: "🐞", text: "Báo lỗi: trang nào, bạn bấm gì, thấy gì (ảnh chụp màn hình càng tốt)" },
  { emoji: "💡", text: "Góp ý tính năng bạn muốn có" },
  { emoji: "📚", text: "Xin bộ từ mẫu, hỏi cách học, hoặc rủ học chung nhóm" },
];

export default function ContactPage() {
  return (
    <div className="py-4">
      <div className="notebook-card flex flex-col items-center px-6 py-8 text-center">
        <span aria-hidden className="animate-float text-5xl">
          👋
        </span>
        <h1 className="mt-3 text-2xl text-ink">Liên hệ với mình</h1>
        <p className="mt-2 max-w-md text-ink-soft">
          Sổ Từ do mình tự làm để học tiếng Anh và tiếng Trung. Có gì cần, bạn cứ nhắn qua Facebook hoặc Zalo nhé, mình sẽ trả lời sớm nhất có thể.
        </p>
      </div>

      <ContactLinks className="mt-6" />

      <section className="mt-8">
        <h2 className="mb-3 text-lg text-ink">Bạn có thể nhắn về</h2>
        <ul className="space-y-2">
          {TOPICS.map((t) => (
            <li key={t.text} className="flex gap-3 rounded-card border border-rule bg-surface px-4 py-3">
              <span aria-hidden>{t.emoji}</span>
              <span className="text-ink">{t.text}</span>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
