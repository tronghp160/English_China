import { ArrowLeft, Database, Download, Lock, ShieldCheck, Trash2 } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { IconTile } from "@/components/ui/icon-tile";

export const metadata: Metadata = {
  title: "Quyền riêng tư",
  description: "Chính sách quyền riêng tư và bảo vệ dữ liệu học tập trên Sổ Từ.",
};

export default function PrivacyPage() {
  return (
    <div className="flex flex-col gap-6 py-4">
      <Link
        href="/lien-he"
        className="inline-flex min-h-10 w-fit items-center gap-1.5 rounded-md text-sm font-semibold text-fg-muted hover:text-fg"
      >
        <ArrowLeft className="size-4" aria-hidden />
        Liên hệ
      </Link>

      <section className="relative overflow-hidden rounded-xl bg-surface p-6 shadow-sm dark:border dark:border-border sm:p-8">
        <div className="flex items-center gap-3">
          <IconTile icon={ShieldCheck} tone="teal" size={48} solid />
          <div>
            <h1 className="text-[1.75rem] font-bold leading-tight sm:text-[2.125rem]">
              Quyền riêng tư
            </h1>
            <p className="mt-1 text-sm text-fg-muted">
              Cách Sổ Từ bảo vệ và quản lý dữ liệu học tập của bạn
            </p>
          </div>
        </div>

        <div className="mt-6 flex flex-col gap-6 text-[0.9375rem] leading-relaxed text-fg">
          <div className="rounded-lg bg-teal-soft/40 p-4 border border-teal-subtle text-teal-fg">
            <p className="font-medium">
              Quản trị viên Sổ Từ có thể xem dữ liệu học tập của bạn (bộ từ, ghi chú, lịch sử ôn,
              trò chuyện với gia sư, vị trí và thiết bị đăng nhập) để hỗ trợ kỹ thuật và quản lý hệ thống. Bạn có thể tải hoặc xóa
              toàn bộ dữ liệu bất cứ lúc nào trong mục Cài đặt.
            </p>
          </div>

          <div className="space-y-3">
            <h2 className="text-lg font-bold flex items-center gap-2">
              <Database className="size-5 text-primary" aria-hidden />
              1. Dữ liệu được lưu trữ
            </h2>
            <p className="text-fg-muted">
              Khi bạn học tập trên Sổ Từ, các dữ liệu sau được lưu để phục vụ thuật toán lặp lại ngắt
              quãng (FSRS) và tính năng cá nhân hóa:
            </p>
            <ul className="list-disc pl-5 space-y-1.5 text-fg-muted">
              <li>Thông tin tài khoản: Email, tên hiển thị, tên người dùng (@username).</li>
              <li>Bộ từ và từ vựng: Các từ bạn tạo, nghĩa, ví dụ, ảnh minh họa và ghi chú cá nhân.</li>
              <li>Lịch sử ôn tập: Thời gian ôn, đánh giá độ nhớ, chế độ luyện tập và chuỗi ngày học.</li>
              <li>Cuộc trò chuyện với Gia sư AI: Nội dung câu hỏi và phản hồi để hỗ trợ bạn học tập.</li>
              <li>
                Hoạt động và vị trí đăng nhập: thời điểm bạn đang dùng ứng dụng, mục bạn đang xem, địa chỉ IP, vị trí ước tính theo IP (thành phố, quốc gia), loại thiết bị và trình duyệt. Lịch sử đăng nhập được giữ tối đa 90 ngày.
              </li>
            </ul>
          </div>

          <div className="space-y-3">
            <h2 className="text-lg font-bold flex items-center gap-2">
              <Lock className="size-5 text-coral-fg" aria-hidden />
              2. Cam kết bảo mật
            </h2>
            <ul className="list-disc pl-5 space-y-1.5 text-fg-muted">
              <li>
                <strong>Không lưu mật khẩu dạng xem được:</strong> Mật khẩu của bạn được băm (hash)
                và bảo mật bởi hạ tầng Supabase Auth, quản trị viên hoàn toàn không thể biết.
              </li>
              <li>
                <strong>Vị trí chỉ là ước tính:</strong> Sổ Từ không xin quyền GPS của thiết bị. Vị trí chỉ suy ra từ địa chỉ IP, thường chỉ chính xác tới cấp thành phố, và chỉ quản trị viên xem được.
              </li>
              <li>
                <strong>Minh bạch thao tác quản trị:</strong> Quản trị viên xem dữ liệu nhạy cảm (lịch sử đăng nhập, trò chuyện gia sư) đều được ghi nhật ký.
              </li>
              <li>
                <strong>Bảo mật thông báo:</strong> Thông tin thiết bị nhận nhắc nhở học tập chỉ lưu số lượng,
                không hiển thị khóa bảo mật hay endpoint.
              </li>
            </ul>
          </div>

          <div className="space-y-3">
            <h2 className="text-lg font-bold flex items-center gap-2">
              <Download className="size-5 text-mint-fg" aria-hidden />
              3. Quyền tải về và xóa dữ liệu
            </h2>
            <p className="text-fg-muted">
              Dữ liệu thuộc về bạn. Bạn luôn có quyền tự chủ cao nhất đối với dữ liệu của mình:
            </p>
            <div className="grid gap-3 sm:grid-cols-2 pt-1">
              <div className="rounded-lg bg-surface-2 p-4 border border-border">
                <h3 className="font-semibold text-fg flex items-center gap-1.5 mb-1">
                  <Download className="size-4 text-mint-fg" />
                  Xuất dữ liệu (JSON)
                </h3>
                <p className="text-xs text-fg-muted">
                  Bạn có thể tải về file sao lưu đầy đủ mọi bộ từ, tiến độ, lịch sử đăng nhập và tin nhắn gia sư trong phần Cài đặt tài khoản.
                </p>
              </div>
              <div className="rounded-lg bg-surface-2 p-4 border border-border">
                <h3 className="font-semibold text-fg flex items-center gap-1.5 mb-1">
                  <Trash2 className="size-4 text-danger-fg" />
                  Xóa tài khoản vĩnh viễn
                </h3>
                <p className="text-xs text-fg-muted">
                  Xóa hẳn tài khoản sẽ lập tức xóa sạch mọi từ vựng, ảnh đã tải lên và tiến độ ôn tập mà không thể khôi phục.
                </p>
              </div>
            </div>
          </div>

          <div className="pt-2 border-t border-border flex items-center justify-between flex-wrap gap-3">
            <p className="text-xs text-fg-subtle">
              Thông báo tuân theo nguyên tắc minh bạch về bảo vệ dữ liệu cá nhân (Nghị định 13/2023/NĐ-CP).
            </p>
            <Button asChild variant="outline" size="sm">
              <Link href="/lien-he">Cần hỗ trợ? Nhắn cho mình</Link>
            </Button>
          </div>
        </div>
      </section>
    </div>
  );
}
