import { AlertTriangle, Bot, Globe, UserX } from "lucide-react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { getAttention } from "@/lib/data/admin-monitor";

export async function AttentionTab() {
  const { churn, stuck, multiCountry, aiHeavy } = await getAttention();

  const sections = [
    {
      title: "Có nguy cơ bỏ học",
      icon: UserX,
      count: churn.length,
      tone: "coral" as const,
      explanation: "Học viên đã học ≥ 7 ngày nhưng không học lại từ 3 đến 30 ngày qua.",
      items: churn,
      hrefFor: (id: string) => `/admin/users/${id}`,
    },
    {
      title: "Đăng ký nhưng chưa học",
      icon: AlertTriangle,
      count: stuck.length,
      tone: "sun" as const,
      explanation: "Tài khoản tạo từ 2 ngày trước trở lên nhưng chưa hoàn thành lượt ôn nào.",
      items: stuck,
      hrefFor: (id: string) => `/admin/users/${id}`,
    },
    {
      title: "Đăng nhập từ nhiều quốc gia",
      icon: Globe,
      count: multiCountry.length,
      tone: "teal" as const,
      explanation: "Có lượt đăng nhập từ 2 quốc gia khác nhau trong 24 giờ qua (nguy cơ dùng chung hoặc VPN).",
      items: multiCountry,
      hrefFor: (id: string) => `/admin/users/${id}?tab=login`,
    },
    {
      title: "Dùng AI sát hạn mức",
      icon: Bot,
      count: aiHeavy.length,
      tone: "grape" as const,
      explanation: "Hôm nay đã dùng từ 80% hạn mức trợ lý AI cá nhân.",
      items: aiHeavy,
      hrefFor: (id: string) => `/admin/users/${id}`,
    },
  ];

  return (
    <section aria-label="Cần chú ý" className="space-y-6">
      <div className="flex flex-col gap-1">
        <h2 className="text-lg font-bold">Người dùng cần chú ý</h2>
        <p className="text-sm text-fg-muted">
          Tổng hợp tự động người dùng có nguy cơ rời bỏ, tài khoản bị nghẽn hoặc dấu hiệu bất thường.
        </p>
      </div>

      <div className="grid gap-6">
        {sections.map((sec, i) => {
          const Icon = sec.icon;
          return (
            <div
              key={i}
              className="rounded-lg bg-surface p-5 shadow-sm dark:border dark:border-border"
            >
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border pb-3">
                <div className="flex items-center gap-2">
                  <Icon className="size-5 text-fg-muted" aria-hidden="true" />
                  <h3 className="text-base font-bold text-fg">{sec.title}</h3>
                  <Badge variant={sec.count > 0 ? "default" : "outline"} tone={sec.count > 0 ? sec.tone : undefined}>
                    {sec.count}
                  </Badge>
                </div>
              </div>
              <p className="mt-2 text-xs text-fg-muted">{sec.explanation}</p>

              {sec.items.length === 0 ? (
                <p className="mt-4 text-sm text-fg-muted italic">Không có ai.</p>
              ) : (
                <ul className="mt-3 divide-y divide-border">
                  {sec.items.map((item) => (
                    <li key={item.userId} className="flex flex-col py-2.5 sm:flex-row sm:items-center sm:justify-between gap-1">
                      <div>
                        <Link
                          href={sec.hrefFor(item.userId)}
                          className="font-medium text-fg hover:underline"
                        >
                          {item.name}
                        </Link>
                        {item.username && (
                          <span className="ml-1.5 text-xs text-fg-muted">@{item.username}</span>
                        )}
                        {item.email && (
                          <span className="ml-2 text-xs text-fg-subtle">({item.email})</span>
                        )}
                      </div>
                      <span className="text-xs text-fg-muted">{item.detail}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}
