import { HeartHandshake } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { IconTile } from "@/components/ui/icon-tile";

/** On /chat: a door to the "bản AI" companion (only rendered when it is switched on). */
export function TutorCloneCard({ name }: { name: string }) {
  return (
    <Card variant="soft" tone="pink" className="space-y-3 p-4 text-c-pink-fg">
      <div className="flex items-center gap-2.5">
        <IconTile icon={HeartHandshake} tone="pink" size={32} />
        <h2 className="text-base font-bold text-c-pink-fg">
          Tâm sự với {name} (bản AI)
        </h2>
      </div>
      <p className="text-sm leading-snug font-medium">
        Muốn nói chuyện thay vì hỏi bài? Bản AI này nói theo những gì {name} tự kể về mình. Cuộc trò chuyện không được lưu ở đâu cả: rời trang là xóa.
      </p>
      <Button asChild variant="outline" size="sm">
        <Link href="/tam-su">Mở trò chuyện</Link>
      </Button>
    </Card>
  );
}
