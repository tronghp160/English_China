import { notFound } from "next/navigation";
import { DeckCover } from "@/components/deck/deck-cover";
import { StatusDot, StatusLegend } from "@/components/deck/status-dot";
import { LangMark } from "@/components/lang-mark";
import { MascotSay } from "@/components/mascot/mascot-say";
import { Pup } from "@/components/mascot/pup";
import { SealStamp } from "@/components/review/seal-stamp";
import { Heatmap } from "@/components/stats/heatmap";
import { ProgressRing } from "@/components/stats/progress-ring";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { EmptyState, InkFigure } from "@/components/ui/empty-state";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Switch } from "@/components/ui/switch";
import { WordSpecimen } from "@/components/word/word-specimen";
import { cjkFontVariables } from "@/lib/fonts";
import { PUP_MOODS } from "@/lib/mascot/lines";

export const metadata = { title: "UI (dev)" };

function Block({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="space-y-3 border-t border-rule pt-6">
      <h2 className="text-lg">{title}</h2>
      {children}
    </section>
  );
}

const DAYS = Array.from({ length: 60 }, (_, i) => {
  const d = new Date(Date.UTC(2026, 9, 24 - i));
  return { day: d.toISOString().slice(0, 10), reviews: (i * 7) % 61 };
});

/** Development-only gallery of the design system's pieces, light and dark. Removed in the last redesign phase. */
export default function DevUiPage() {
  if (process.env.NODE_ENV === "production") notFound();
  return (
    <main className={`${cjkFontVariables} mx-auto max-w-5xl space-y-8 px-4 py-8`}>
      <h1 className="text-xl">Thành phần giao diện (chỉ dev)</h1>

      <Block title="Nút">
        <div className="flex flex-wrap items-center gap-2">
          <Button>Bắt đầu ôn</Button>
          <Button variant="outline">Thêm từ</Button>
          <Button variant="secondary">Hỏi gia sư</Button>
          <Button variant="ghost">Bỏ qua</Button>
          <Button variant="destructive">Xóa bộ từ</Button>
          <Button variant="link">Xem thêm</Button>
          <Button disabled>Đang lưu</Button>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button size="sm">Nhỏ 36</Button>
          <Button>Mặc định 44</Button>
          <Button size="lg">Lớn 52</Button>
          <Button size="icon" variant="outline" aria-label="Thêm">+</Button>
        </div>
      </Block>

      <Block title="Ô nhập, công tắc, chọn">
        <div className="grid gap-4 sm:grid-cols-2">
          <Input placeholder="Nhập một từ" />
          <Input defaultValue="resilient" aria-invalid />
        </div>
        <div className="flex flex-wrap items-center gap-6">
          <label className="flex items-center gap-2"><Switch defaultChecked /> Bật</label>
          <label className="flex items-center gap-2"><Switch /> Tắt</label>
          <label className="flex items-center gap-2"><Checkbox defaultChecked /> Đã chọn</label>
          <RadioGroup defaultValue="a" className="flex w-auto gap-4">
            <label className="flex items-center gap-2"><RadioGroupItem value="a" /> Tiếng Anh</label>
            <label className="flex items-center gap-2"><RadioGroupItem value="b" /> Tiếng Trung</label>
          </RadioGroup>
        </div>
      </Block>

      <Block title="Chip, dấu ngôn ngữ, trạng thái, tiến độ">
        <div className="flex flex-wrap items-center gap-2">
          <Badge>Mới</Badge>
          <Badge variant="secondary">B2</Badge>
          <Badge variant="outline">tính từ</Badge>
          <Badge variant="destructive">HSK 3</Badge>
          <LangMark lang="en" />
          <LangMark lang="zh" />
          {(["new", "learning", "review", "review"] as const).map((s, i) => (
            <StatusDot key={i} state={s} lapses={i === 3 ? 4 : 0} suspended={false} withLabel />
          ))}
          <StatusDot state="new" lapses={0} suspended withLabel />
        </div>
        <StatusLegend />
        <Progress value={62} className="max-w-sm" />
        <div className="flex items-center gap-4">
          <ProgressRing value={62}>
            <span className="font-display text-lg font-semibold tabular-nums">62</span>
          </ProgressRing>
          <ProgressRing value={100}>
            <span className="font-display text-lg font-semibold tabular-nums">100</span>
          </ProgressRing>
        </div>
      </Block>

      <Block title="Bìa vở">
        <div className="flex flex-wrap items-end gap-4">
          {["a1", "b2", "c3", "d4", "e5", "f6"].map((id, i) => (
            <DeckCover key={id} id={id} language={i % 2 ? "zh" : "en"} name="IELTS Core Vocabulary" size="md" />
          ))}
          <DeckCover id="lg1" language="en" name="IELTS Core Vocabulary" size="lg" />
          <DeckCover id="lg2" language="zh" name="HSK 1 Chào hỏi" size="lg" />
          <DeckCover id="sm1" language="en" size="sm" />
          <DeckCover id="sm2" language="zh" size="sm" />
        </div>
      </Block>

      <Block title="Mẫu chữ">
        <div className="grid gap-4 md:grid-cols-2">
          <WordSpecimen lang="en" term="resilient" reading="/rɪˈzɪliənt/" size="lg" />
          <div className="space-y-4">
            <WordSpecimen lang="en" term="adventure" reading="/ədˈventʃər/" size="md" />
            <WordSpecimen lang="en" term="hello" reading="/həˈloʊ/" size="sm" />
            <WordSpecimen lang="en" term="internationalization" reading="/ˌɪntərnæʃənəlaɪˈzeɪʃən/" size="lg" />
          </div>
          <WordSpecimen lang="zh" term="坚强" reading="jiānqiáng" size="lg" />
          <div className="space-y-4">
            <WordSpecimen lang="zh" term="你好" reading="nǐ hǎo" size="md" />
            <WordSpecimen lang="zh" term="谢谢" reading="xièxie" size="sm" />
          </div>
        </div>
      </Block>

      <Block title="Con dấu">
        <div className="flex flex-wrap items-center gap-8">
          <SealStamp text="Đã ôn" sub="24.10" />
          <SealStamp text="Xong bài" size={80} />
          <SealStamp text="Nhất" size={28} />
        </div>
      </Block>

      <Block title="Bin: 10 biểu cảm">
        <div className="flex flex-wrap items-end gap-3">
          {PUP_MOODS.map((m) => (
            <figure key={m} className="flex flex-col items-center gap-1">
              <Pup mood={m} size={96} />
              <figcaption className="text-xs text-ink-soft">{m}</figcaption>
            </figure>
          ))}
        </div>
        <div className="flex flex-wrap items-end gap-6">
          <Pup mood="happy" size={28} />
          <Pup mood="cheer" size={40} />
          <Pup mood="wave" size={56} />
        </div>
        <MascotSay mood="happy" name="Bin" text="Có 24 từ đến hạn. Ôn xong là nghỉ." />
      </Block>

      <Block title="Trạng thái trống">
        <div className="flex flex-wrap items-start gap-6">
          {(["notebook", "grid", "people", "chat", "check"] as const).map((n) => (
            <InkFigure key={n} name={n} />
          ))}
        </div>
        <EmptyState figure="notebook" title="Sổ của bạn còn trống." actions={<Button>Thêm bộ từ mẫu</Button>}>
          Thêm vài từ đầu tiên, hoặc nhập cả bộ từ mẫu để thử ngay.
        </EmptyState>
      </Block>

      <Block title="Lịch học">
        <Heatmap days={DAYS} today="2026-10-24" restDays={["2026-10-20"]} />
      </Block>
    </main>
  );
}
