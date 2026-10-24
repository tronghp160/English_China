import type { Metadata } from "next";
import { ContactLinks } from "@/components/contact/contact-links";
import { CONTACT } from "@/lib/contact";

export const metadata: Metadata = {
  title: "Liên hệ",
  description: "Góp ý, báo lỗi hoặc hỏi về Sổ Từ: nhắn Xễu Đùng Đùng qua Facebook và Zalo.",
};

const TOPICS = [
  "Báo lỗi: trang nào, bạn bấm gì, thấy gì (ảnh chụp màn hình càng tốt)",
  "Góp ý tính năng bạn muốn có",
  "Xin bộ từ mẫu, hỏi cách học, hoặc rủ học chung nhóm",
];

export default function ContactPage() {
  return (
    <div className="py-4">
      <div className="rounded-xl border border-border/60 bg-surface p-5 shadow-sm sm:p-6">
        <h1 className="text-[1.6875rem] leading-tight sm:text-[2.125rem]">Liên hệ với {CONTACT.nickname}</h1>
        <p className="max-w-[48ch] mt-3 text-[1.0625rem] leading-relaxed">
          Chào bạn, mình là {CONTACT.nickname}, người làm Sổ Từ để học tiếng Anh và tiếng Trung. Có gì cần, bạn cứ nhắn qua Facebook hoặc Zalo, mình sẽ trả lời sớm nhất có thể.
        </p>
      </div>

      <ContactLinks className="mt-6" />

      <section className="mt-8" aria-labelledby="contact-topics">
        <h2 id="contact-topics" className="mb-3 text-lg">
          Bạn có thể nhắn về
        </h2>
        <ul className="divide-y divide-border border-y border-border">
          {TOPICS.map((t) => (
            <li key={t} className="px-1 py-3 text-fg">
              {t}
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
