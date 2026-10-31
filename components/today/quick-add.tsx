"use client";

import { Plus } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { LangMark } from "@/components/lang-mark";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { LANGUAGES } from "@/lib/lang/registry";
import type { LangCode } from "@/lib/lang/types";
import { cn } from "@/lib/utils";

const KEY = "sotu-quickadd-deck";

export type QuickAddDeck = {
  id: string;
  name: string;
  language: LangCode;
};

export function QuickAdd({
  decks,
  className,
}: {
  decks: QuickAddDeck[];
  className?: string;
}) {
  const router = useRouter();
  const [deckId, setDeckId] = useState(decks[0]?.id ?? "");
  const [value, setValue] = useState("");

  useEffect(() => {
    try {
      const saved = localStorage.getItem(KEY);
      if (saved && decks.some((d) => d.id === saved)) {
        queueMicrotask(() => setDeckId(saved));
      }
    } catch {}
  }, [decks]);

  function choose(id: string) {
    setDeckId(id);
    try {
      localStorage.setItem(KEY, id);
    } catch {}
  }

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const term = value.trim().slice(0, 80);
    if (!deckId) return;
    router.push(term ? `/decks/${deckId}/add?term=${encodeURIComponent(term)}` : `/decks/${deckId}/add`);
  }

  if (decks.length === 0) {
    return (
      <Card className={cn("flex h-full flex-col gap-3 p-5", className)}>
        <h2 className="text-lg">Thêm từ nhanh</h2>
        <p className="text-sm text-fg-muted">Bạn chưa có bộ từ nào của riêng mình.</p>
        <div className="mt-auto pt-2">
          <Button asChild variant="outline">
            <Link href="/decks/new">
              <Plus className="size-4" aria-hidden />
              Tạo bộ từ
            </Link>
          </Button>
        </div>
      </Card>
    );
  }

  const selectedDeck = decks.find((d) => d.id === deckId) ?? decks[0];
  const lang = selectedDeck?.language ?? "en";
  const placeholder = LANGUAGES[lang]?.termPlaceholder ?? "Gõ từ...";

  return (
    <Card className={cn("flex h-full flex-col gap-3 p-5", className)}>
      <div>
        <h2 className="text-lg">Thêm từ nhanh</h2>
        <p className="text-sm text-fg-muted">Gõ một từ, Sổ Từ điền nghĩa và ví dụ giúp bạn.</p>
      </div>

      <form onSubmit={onSubmit} className="flex flex-col gap-3">
        <div className="flex flex-col gap-2 sm:flex-row">
          <Input
            aria-label="Từ muốn thêm"
            placeholder={placeholder}
            autoComplete="off"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            className="h-12 flex-1"
          />
          <Button type="submit" className="h-12 shrink-0">
            <Plus className="size-4" aria-hidden />
            Thêm
          </Button>
        </div>

        {decks.length > 1 ? (
          <div className="flex items-center gap-2">
            <span className="text-xs text-fg-muted shrink-0">Vào bộ:</span>
            <Select value={deckId} onValueChange={choose}>
              <SelectTrigger size="sm" className="max-w-full truncate text-xs" aria-label="Vào bộ">
                <SelectValue placeholder="Chọn bộ từ" />
              </SelectTrigger>
              <SelectContent>
                {decks.map((d) => (
                  <SelectItem key={d.id} value={d.id} className="text-xs">
                    <span className="flex items-center gap-1.5">
                      <LangMark lang={d.language} />
                      <span className="truncate">{d.name}</span>
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        ) : (
          <p className="text-xs text-fg-muted">
            Vào bộ <span className="font-semibold text-fg">{decks[0].name}</span>
          </p>
        )}
      </form>

      <div className="mt-auto pt-1">
        <Link
          href={`/decks/${deckId}/add?mode=list`}
          className="inline-flex min-h-10 items-center text-xs text-fg-muted hover:text-fg hover:underline"
        >
          Nhập nhiều từ một lúc
        </Link>
      </div>
    </Card>
  );
}
