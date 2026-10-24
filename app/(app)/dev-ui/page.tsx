import { notFound } from "next/navigation";
import { BookOpen, Compass, Pencil, Plus } from "lucide-react";

import { Logo } from "@/components/brand/logo";
import { FxDemo } from "@/components/fx/fx-demo";
import { LangMark } from "@/components/lang-mark";
import { MascotSay } from "@/components/mascot/mascot-say";
import { Pup } from "@/components/mascot/pup";
import { ProgressRing } from "@/components/stats/progress-ring";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { IconTile } from "@/components/ui/icon-tile";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { PUP_MOODS } from "@/lib/mascot/lines";
import { TONE_CLASSES, TONES } from "@/lib/tone";

export const metadata = { title: "UI kit (dev)" };

/** Every primitive of the design system on one page, for screenshots in both themes. Development only. */
export default function DevUiPage() {
  if (process.env.NODE_ENV === "production") notFound();
  return (
    <div className="space-y-10 pb-24">
      <h1 className="text-2xl">UI kit</h1>

      <section className="space-y-3">
        <h2 className="text-lg">Màu</h2>
        <div className="grid grid-cols-3 gap-3 sm:grid-cols-5 lg:grid-cols-9">
          {TONES.map((t) => (
            <div key={t} className="space-y-1.5 text-xs font-semibold">
              <div className={`h-10 rounded-md ${TONE_CLASSES[t].solid}`} />
              <div className={`flex h-10 items-center justify-center rounded-md ${TONE_CLASSES[t].soft} ${TONE_CLASSES[t].fg}`}>{t}</div>
            </div>
          ))}
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg">Nút</h2>
        <div className="flex flex-wrap items-center gap-3">
          <Button>Mặc định</Button>
          <Button variant="pressable">Pressable</Button>
          <Button variant="secondary">Secondary</Button>
          <Button variant="outline">Outline</Button>
          <Button variant="ghost">Ghost</Button>
          <Button variant="destructive">Xóa</Button>
          <Button className="bg-danger text-white hover:bg-danger/90">Xóa vĩnh viễn</Button>
          <Button variant="link">Link</Button>
          <Button size="sm">Nhỏ</Button>
          <Button size="xs">Rất nhỏ</Button>
          <Button size="lg">Lớn</Button>
          <Button size="icon" aria-label="Thêm"><Plus /></Button>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          {TONES.map((t) => (
            <Button key={t} variant="soft" tone={t}>{t}</Button>
          ))}
        </div>
        <div className="flex flex-wrap gap-3">
          <Button variant="pressable" tone="again">Quên</Button>
          <Button variant="pressable" tone="hard">Khó</Button>
          <Button variant="pressable" tone="good">Nhớ</Button>
          <Button variant="pressable" tone="easy">Dễ</Button>
        </div>
        <Button variant="pressable" size="xl" className="w-full">Bắt đầu luyện</Button>
        <Card variant="solid" className="p-6">
          <Button variant="white" size="lg">Bắt đầu ôn</Button>
        </Card>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg">Thẻ, ô icon, chip</h2>
        <div className="grid gap-4 md:grid-cols-3">
          <Card interactive className="flex items-center gap-3.5 p-4">
            <IconTile icon={Plus} tone="mint" size={44} solid />
            <span className="flex flex-col"><b>Thêm từ</b><span className="text-sm text-fg-muted">AI gợi ý nghĩa, ví dụ</span></span>
          </Card>
          <Card variant="soft" tone="sun" className="flex items-center gap-3 p-5 text-c-sun-fg">
            <IconTile icon={Pencil} tone="sun" size={40} solid />
            <b>Chuỗi ngày</b>
          </Card>
          <Card variant="outline" className="flex items-center gap-3 p-5">
            <IconTile icon={Compass} tone="orange" />
            <b>Khám phá</b>
          </Card>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <LangMark lang="en" />
          <LangMark lang="zh" />
          <Badge variant="secondary">secondary</Badge>
          <Badge variant="due">5 cần ôn</Badge>
          <Badge variant="success">Đã ôn xong</Badge>
          <Badge variant="soft" tone="grape">Danh từ</Badge>
          <Badge variant="outline">outline</Badge>
          <Logo />
        </div>
      </section>

      <section className="grid gap-6 md:grid-cols-2">
        <div className="space-y-3">
          <h2 className="text-lg">Ô nhập</h2>
          <Input placeholder="Tìm từ trong sổ" />
          <Input aria-invalid defaultValue="Sai rồi" />
          <Textarea placeholder="Ghi chú" />
          <label className="flex items-center justify-between gap-3 text-sm font-semibold">
            Tính vào ôn tập <Switch defaultChecked />
          </label>
        </div>
        <div className="space-y-4">
          <h2 className="text-lg">Tiến độ</h2>
          <Progress value={60} />
          <div className="flex items-center gap-4">
            <ProgressRing value={45} size={72} stroke={9}><span className="font-display text-sm text-success-fg">45%</span></ProgressRing>
            <ProgressRing value={100} size={72} stroke={9}><span className="font-display text-sm text-success-fg">100%</span></ProgressRing>
            <Avatar size="lg"><AvatarFallback seed="u1">BD</AvatarFallback></Avatar>
            <Avatar size="lg"><AvatarFallback seed="u2">AM</AvatarFallback></Avatar>
          </div>
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg">Bin</h2>
        <div className="flex flex-wrap items-end gap-4">
          {PUP_MOODS.map((m) => (
            <div key={m} className="flex flex-col items-center gap-1 text-xs text-fg-muted">
              <Pup mood={m} size={72} />
              {m}
            </div>
          ))}
        </div>
        <MascotSay mood="cheer" name="Bin" text="Ôn xong 24 từ này là giữ được chuỗi 3 ngày đó!" />
      </section>

      <section className="space-y-3">
        <h2 className="text-lg">Trạng thái trống</h2>
        <div className="grid gap-4 md:grid-cols-2">
          <EmptyState figure="notebook" title="Chưa có bộ từ nào">Tạo bộ từ đầu tiên hoặc thêm bộ từ mẫu.</EmptyState>
          <EmptyState figure="check" title="Hôm nay ôn xong rồi" actions={<Button size="sm"><BookOpen />Luyện thêm</Button>} />
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg">Hiệu ứng (V3)</h2>
        <FxDemo />
      </section>
    </div>
  );
}
