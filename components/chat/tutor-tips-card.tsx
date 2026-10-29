import { Lightbulb } from "lucide-react";
import { Card } from "@/components/ui/card";
import { IconTile } from "@/components/ui/icon-tile";

export function TutorTipsCard() {
  return (
    <Card variant="soft" tone="sun" className="p-4 space-y-3 text-c-sun-fg">
      <div className="flex items-center gap-2.5">
        <IconTile icon={Lightbulb} tone="sun" size={32} />
        <h2 className="text-base font-bold text-c-sun-fg">Mẹo hỏi hay</h2>
      </div>

      <ul className="space-y-2 text-sm leading-snug font-medium text-c-sun-fg">
        <li className="flex items-start gap-2">
          <span className="select-none">•</span>
          <span>Gửi cả câu bạn viết để được sửa lỗi.</span>
        </li>
        <li className="flex items-start gap-2">
          <span className="select-none">•</span>
          <span>Nói &ldquo;cho mình 3 ví dụ&rdquo; khi chưa hiểu.</span>
        </li>
        <li className="flex items-start gap-2">
          <span className="select-none">•</span>
          <span>Nói &ldquo;đố mình&rdquo; để được kiểm tra từng câu.</span>
        </li>
      </ul>
    </Card>
  );
}
