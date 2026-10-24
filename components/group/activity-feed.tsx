import Link from "next/link";
import { Flame } from "lucide-react";
import type { FeedItem } from "@/lib/data/groups";
import { formatAgo } from "@/lib/format";

function Line({ item }: { item: FeedItem }) {
  const name = <span className="font-medium text-fg">{item.name}</span>;
  switch (item.kind) {
    case "words":
      return (
        <>
          {name} thêm {item.n} từ vào{" "}
          <Link href={`/decks/${item.deckId}`} className="font-medium text-primary underline-offset-4 hover:underline">
            {item.deckName}
          </Link>
        </>
      );
    case "joined":
      return <>{name} đã vào nhóm</>;
    case "created":
      return <>{name} đã tạo nhóm</>;
    case "streak":
      return (
        <>
          {name} đang giữ chuỗi {item.n} ngày
        </>
      );
  }
}

/** Recent activity as a vertical timeline: a small dot per line, the time under it. */
export function ActivityFeed({ items }: { items: FeedItem[] }) {
  return (
    <section aria-labelledby="feed-title">
      <h2 id="feed-title" className="mb-3 text-lg">
        Hoạt động gần đây
      </h2>
      {items.length ? (
        <ol className="relative ml-1.5 border-l border-border-strong">
          {items.map((item) => (
            <li key={item.key} className="relative pb-4 pl-5 text-[0.9375rem] text-fg-muted last:pb-0">
              <span aria-hidden className="absolute top-2 -left-[3.5px] size-1.5 rounded-full bg-border-strong" />
              <p>
                {item.kind === "streak" && <Flame className="mr-1 inline size-3.5 text-streak" aria-hidden />}
                <Line item={item} />
              </p>
              {"at" in item && <p className="text-xs">{formatAgo(item.at)}</p>}
            </li>
          ))}
        </ol>
      ) : (
        <p className="text-sm text-fg-muted">Chưa có hoạt động nào trong 14 ngày qua.</p>
      )}
    </section>
  );
}
