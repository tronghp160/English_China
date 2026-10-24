import { Flame, Sparkles, Smartphone, WifiOff } from "lucide-react";
import { MODE_LOOK } from "@/components/practice/mode-look";
import { Badge } from "@/components/ui/badge";
import { IconTile } from "@/components/ui/icon-tile";
import { PinyinText } from "@/components/zh/pinyin-text";
import type { PracticeMode } from "@/lib/lang/registry";
import { TONE_CLASSES, type Tone } from "@/lib/tone";
import { cn } from "@/lib/utils";

const MODES: PracticeMode[] = ["learn", "test", "match", "flashcard", "quiz", "typing", "listening", "cloze"];

function Tile({
  tone,
  title,
  body,
  className,
  children,
}: {
  tone: Tone;
  title: string;
  body: string;
  className?: string;
  children: React.ReactNode;
}) {
  const t = TONE_CLASSES[tone];
  return (
    <li className={cn("flex flex-col gap-4 rounded-xl p-6", t.soft, className)}>
      <div>
        <h3 className={cn("text-lg font-extrabold tracking-[-0.02em]", t.fg)}>{title}</h3>
        <p className="mt-1.5 max-w-[44ch] text-[0.9375rem] text-fg-muted">{body}</p>
      </div>
      <div className="mt-auto" aria-hidden>
        {children}
      </div>
    </li>
  );
}

/** The six features of the landing page as a bento grid; each tile carries a small real piece of the UI. */
export function FeatureBento() {
  return (
    <ul className="grid gap-4 md:grid-cols-3">
      <Tile
        tone="blue"
        className="md:col-span-2"
        title="Gõ một từ, AI điền phần còn lại"
        body="Nghĩa tiếng Việt, phiên âm, câu ví dụ và ảnh minh họa hiện ra sau một nhịp gõ. Bạn chỉ cần xem lại và lưu."
      >
        <div className="flex flex-col gap-3 rounded-lg bg-surface p-4 shadow-sm">
          <div className="flex gap-2">
            <span className="flex h-11 flex-1 items-center rounded-md bg-surface-2 px-4 text-lg font-bold">resilient</span>
            <span className="inline-flex h-11 items-center gap-1.5 rounded-md bg-primary-soft px-4 text-sm font-semibold text-primary-fg">
              <Sparkles className="size-4" /> Gợi ý
            </span>
          </div>
          <div className="flex flex-wrap gap-2 text-sm font-semibold">
            <span className="rounded-full bg-primary px-3.5 py-2 text-on-primary">kiên cường, mau phục hồi</span>
            <span className="rounded-full border border-border-strong px-3.5 py-2 text-fg-muted">co giãn, đàn hồi</span>
          </div>
        </div>
      </Tile>

      <Tile tone="mint" title="Ôn đúng lúc sắp quên" body="Thuật toán FSRS dời lịch ôn theo cách bạn nhớ từng từ.">
        <div className="grid grid-cols-4 gap-1.5 text-center text-xs font-extrabold text-white">
          {[
            ["Quên", "bg-rate-again shadow-[0_3px_0_0_var(--rate-again-press)]"],
            ["Khó", "bg-rate-hard shadow-[0_3px_0_0_var(--rate-hard-press)]"],
            ["Nhớ", "bg-rate-good shadow-[0_3px_0_0_var(--rate-good-press)]"],
            ["Dễ", "bg-rate-easy shadow-[0_3px_0_0_var(--rate-easy-press)]"],
          ].map(([label, cls]) => (
            <span key={label} className={cn("rounded-md py-3", cls)}>
              {label}
            </span>
          ))}
        </div>
      </Tile>

      <Tile tone="orange" title="8 cách luyện" body="Học theo vòng, kiểm tra, ghép thẻ, lật thẻ, nghe, gõ và hơn thế nữa.">
        <div className="grid grid-cols-4 gap-2">
          {MODES.map((m) => (
            <IconTile key={m} icon={MODE_LOOK[m].icon} tone={MODE_LOOK[m].tone} size={40} solid />
          ))}
        </div>
      </Tile>

      <Tile tone="coral" title="Chữ Hán có pinyin màu" body="Màu theo thanh điệu và thứ tự nét để tập viết từng chữ.">
        <div className="flex items-end gap-5 rounded-lg bg-surface px-5 py-4 shadow-sm">
          {[
            ["坚", "jiān"],
            ["强", "qiáng"],
          ].map(([c, p]) => (
            <span key={c} className="flex flex-col items-center gap-1">
              <span lang="zh-CN" className="font-hanzi-sans text-5xl leading-none font-bold">
                {c}
              </span>
              <PinyinText pinyin={p} className="text-base font-semibold" />
            </span>
          ))}
        </div>
      </Tile>

      <Tile tone="grape" title="Học cùng bạn bè" body="Chia sẻ bộ từ bằng link, lập nhóm và so điểm XP mỗi tuần.">
        <ol className="flex flex-col gap-1.5 text-sm font-semibold" aria-label="Bảng xếp hạng mẫu">
          {[
            ["1", "Lan", "320", true],
            ["2", "Minh", "290", false],
          ].map(([r, n, xp, first]) => (
            <li key={String(r)} className="flex items-center gap-2.5 rounded-md bg-surface px-3 py-2 shadow-sm">
              <span className={cn("grid size-6 place-items-center rounded-full text-xs font-extrabold", first ? "bg-c-sun text-c-sun-fg" : "bg-surface-3 text-fg-muted")}>{r}</span>
              <span className="flex-1">{n}</span>
              {first && <Flame className="size-4 fill-c-sun text-c-sun-fg" />}
              <Badge variant="soft" tone="grape">
                {xp} XP
              </Badge>
            </li>
          ))}
        </ol>
      </Tile>

      <Tile
        tone="teal"
        className="md:col-span-3 md:flex-row md:items-center md:justify-between"
        title="Cài như ứng dụng, ôn cả khi mất mạng"
        body="Thêm Sổ Từ vào màn hình chính, kết quả ôn lúc mất mạng được lưu trên máy và tự gửi lại khi có mạng."
      >
        <div className="flex gap-3">
          <IconTile icon={Smartphone} tone="teal" size={48} solid />
          <IconTile icon={WifiOff} tone="blue" size={48} solid />
        </div>
      </Tile>
    </ul>
  );
}
