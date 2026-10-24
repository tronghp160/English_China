import type { Metadata } from "next";
import { ContactLinks } from "@/components/contact/contact-links";
import { Paper } from "@/components/word/word-specimen";
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
      <Paper innerClassName="pb-3">
        <h1 className="flex h-16 items-end text-xl leading-none">Liên hệ với {CONTACT.nickname}</h1>
        <p className="max-w-[48ch] text-[1.0625rem] leading-[var(--line)]">
          Chào bạn, mình là {CONTACT.nickname}, người làm Sổ Từ để học tiếng Anh và tiếng Trung. Có gì cần, bạn cứ nhắn qua Facebook hoặc Zalo, mình sẽ trả lời sớm nhất có thể.
        </p>
      </Paper>

      <ContactLinks className="mt-6" />

      <section className="mt-8" aria-labelledby="contact-topics">
        <h2 id="contact-topics" className="mb-3 text-lg">
          Bạn có thể nhắn về
        </h2>
        <ul className="ruled-list border-y border-rule">
          {TOPICS.map((t) => (
            <li key={t} className="px-1 py-3 text-ink">
              {t}
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
