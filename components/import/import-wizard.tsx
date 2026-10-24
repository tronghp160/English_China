"use client";

import { AlertCircle, Camera, CheckCircle2, FileUp, Loader2, RotateCcw, Sparkles } from "lucide-react";
import Link from "next/link";
import { useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { createWordsBulk } from "@/lib/actions/words";
import type { EnrichResult } from "@/lib/ai/schemas";
import { enrichToWord } from "@/lib/ai/to-word";
import { compressImage } from "@/lib/image-compress";
import { parseImport, type ParsedLine } from "@/lib/import-parser";
import type { LangCode } from "@/lib/lang/types";
import { cn } from "@/lib/utils";
import { emptyWord, type WordInput } from "@/lib/word-schema";

type ItemState = "pending" | "working" | "saved" | "skipped" | "failed";
type Item = ParsedLine & { state: ItemState; error?: string; wordId?: string };

const BATCH = 10;
const PARALLEL = 3;

const PLACEHOLDER: Record<LangCode, string> = {
  en: "apple - quả táo\nresilient\ngive up: từ bỏ\nwell-known = nổi tiếng",
  zh: "苹果 - quả táo\n坚强\n跑步 pǎobù chạy bộ",
};

function toWordInput(line: ParsedLine, result: EnrichResult | null): WordInput {
  const base = result ? { ...emptyWord(), ...enrichToWord(result, 0) } : emptyWord();
  return {
    ...base,
    term: line.term,
    // The user's own meaning/reading always wins over the AI (§7.7).
    meaning_vi: line.meaning_vi || base.meaning_vi || "",
    reading: line.reading || base.reading || "",
    ai_generated: Boolean(result),
  };
}

async function runPool<T>(tasks: (() => Promise<T>)[], limit: number) {
  const queue = [...tasks];
  await Promise.all(
    Array.from({ length: Math.min(limit, queue.length) }, async () => {
      while (queue.length) await queue.shift()!();
    }),
  );
}

export function ImportWizard({
  deckId,
  language,
  existing,
  aiEnabled,
  visionEnabled,
}: {
  deckId: string;
  language: LangCode;
  existing: string[];
  aiEnabled: boolean;
  visionEnabled: boolean;
}) {
  const [text, setText] = useState("");
  const [items, setItems] = useState<Item[] | null>(null);
  const [running, setRunning] = useState(false);
  const [ocrBusy, setOcrBusy] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const photoRef = useRef<HTMLInputElement>(null);
  const [existingSet, setExistingSet] = useState(() => new Set(existing));

  const preview = useMemo(() => (text.trim() ? parseImport(text, language, existingSet) : null), [text, language, existingSet]);

  function update(terms: Set<string>, patch: Partial<Item> | ((i: Item) => Partial<Item>)) {
    setItems((list) =>
      list ? list.map((it) => (terms.has(it.normalized) ? { ...it, ...(typeof patch === "function" ? patch(it) : patch) } : it)) : list,
    );
  }

  async function processBatch(batch: Item[], useAi: boolean) {
    const keys = new Set(batch.map((b) => b.normalized));
    update(keys, { state: "working", error: undefined });
    let results: (EnrichResult | null)[] = batch.map(() => null);
    const failedAi = new Map<string, string>();

    if (useAi) {
      try {
        const res = await fetch("/api/ai/enrich-batch", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ language, items: batch.map((b) => ({ term: b.term, meaning_vi: b.meaning_vi })) }),
        });
        const body = await res.json();
        if (!res.ok) throw new Error(body.error || "Lỗi gợi ý");
        results = (body.outcomes as ({ ok: true; result: EnrichResult } | { ok: false; error: string })[]).map((o, i) => {
          if (o.ok) return o.result;
          failedAi.set(batch[i].normalized, o.error);
          return null;
        });
      } catch (e) {
        batch.forEach((b) => failedAi.set(b.normalized, (e as Error).message));
      }
    }

    // Save words that have a meaning (from the user or the AI); the rest wait for a retry.
    const ready = batch.filter((b, i) => results[i] || (!useAi && b.meaning_vi));
    const notReady = batch.filter((b) => !ready.includes(b));
    if (notReady.length) {
      notReady.forEach((b) =>
        update(new Set([b.normalized]), {
          state: "failed",
          error: failedAi.get(b.normalized) ?? (useAi ? "AI không trả kết quả" : "Thiếu nghĩa — cần AI hoặc tự nhập"),
        }),
      );
    }
    if (!ready.length) return;
    const res = await createWordsBulk(
      deckId,
      ready.map((b) => toWordInput(b, results[batch.indexOf(b)])),
    );
    if (!res.ok) {
      update(new Set(ready.map((r) => r.normalized)), { state: "failed", error: res.error });
      return;
    }
    const savedByTerm = new Map(res.data.inserted.map((w) => [w.term, w.id]));
    setItems((list) =>
      list
        ? list.map((it) => {
            if (!ready.some((r) => r.normalized === it.normalized)) return it;
            const id = savedByTerm.get(it.term);
            if (id) return { ...it, state: "saved", wordId: id };
            if (res.data.invalid.includes(it.term)) return { ...it, state: "failed", error: "Dữ liệu không hợp lệ" };
            return { ...it, state: "skipped", error: "Đã có trong bộ" };
          })
        : list,
    );
    setExistingSet((s) => new Set([...s, ...ready.map((r) => r.normalized)]));
  }

  async function run(target: Item[], useAi: boolean) {
    if (!target.length) return;
    setRunning(true);
    const batches: Item[][] = [];
    for (let i = 0; i < target.length; i += BATCH) batches.push(target.slice(i, i + BATCH));
    await runPool(
      batches.map((b) => () => processBatch(b, useAi)),
      PARALLEL,
    );
    setRunning(false);
  }

  function start(useAi: boolean) {
    if (!preview?.ok.length) return;
    const source = useAi ? preview.ok : preview.ok.filter((l) => l.meaning_vi);
    const list: Item[] = source.map((l) => ({ ...l, state: "pending" }));
    setItems(list);
    void run(list, useAi);
  }

  async function readFile(file: File | undefined) {
    if (!file) return;
    if (file.size > 500_000) return void toast.error("File quá lớn (tối đa 500 KB).");
    setText(await file.text());
    if (fileRef.current) fileRef.current.value = "";
  }

  async function readPhoto(file: File | undefined) {
    if (!file) return;
    setOcrBusy(true);
    try {
      const blob = await compressImage(file, { maxSize: 1600, maxBytes: 1_500_000 });
      const form = new FormData();
      form.append("image", blob, "page.webp");
      form.append("language", language);
      const res = await fetch("/api/ai/ocr", { method: "POST", body: form });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error || "Không đọc được ảnh.");
      const lines = (body.lines as string[]).join("\n");
      setText((t) => (t.trim() ? `${t.trim()}\n${lines}` : lines));
      toast.success(`Đã đọc ${body.lines.length} dòng — kiểm tra lại trước khi thêm`);
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setOcrBusy(false);
      if (photoRef.current) photoRef.current.value = "";
    }
  }

  if (items) {
    const done = items.filter((i) => i.state === "saved" || i.state === "skipped" || i.state === "failed").length;
    const saved = items.filter((i) => i.state === "saved").length;
    const failed = items.filter((i) => i.state === "failed");
    return (
      <div className="space-y-5">
        <div className="rounded-lg border border-border/60 bg-surface shadow-sm px-5 py-5">
          <div className="flex items-center justify-between gap-3">
            <p className="font-medium text-fg">
              {running ? "Đang điền và thêm từ…" : `Đã thêm ${saved}/${items.length} từ`}
            </p>
            <span className="text-sm text-fg-muted">
              {done}/{items.length}
            </span>
          </div>
          <Progress value={(done / items.length) * 100} className="mt-3 h-2" aria-label="Tiến độ nhập" />
          {!running && (
            <div className="mt-4 flex flex-wrap gap-2">
              {failed.length > 0 && (
                <Button type="button" onClick={() => void run(failed, aiEnabled)} className="h-11 gap-2 rounded-md">
                  <RotateCcw className="size-4" aria-hidden />
                  Thử lại {failed.length} từ lỗi
                </Button>
              )}
              <Button asChild variant="outline" className="h-11 rounded-md">
                <Link href={`/decks/${deckId}`}>Về bộ từ</Link>
              </Button>
              <Button
                type="button"
                variant="ghost"
                className="h-11 rounded-md"
                onClick={() => {
                  setItems(null);
                  setText("");
                }}
              >
                Nhập tiếp
              </Button>
            </div>
          )}
        </div>
        <ul className="divide-y divide-border overflow-hidden rounded-xl border border-border bg-surface">
          {items.map((it) => (
            <li key={it.normalized} className="flex min-h-14 items-center gap-3 px-4 py-2">
              <span className="w-6 shrink-0">
                {it.state === "working" || it.state === "pending" ? (
                  <Loader2 className={cn("size-5 text-fg-muted", it.state === "working" && "animate-spin")} aria-label="Đang xử lý" />
                ) : it.state === "saved" ? (
                  <CheckCircle2 className="size-5 text-success" aria-label="Đã thêm" />
                ) : (
                  <AlertCircle className={cn("size-5", it.state === "failed" ? "text-danger-fg" : "text-fg-muted")} aria-label={it.state === "failed" ? "Lỗi" : "Bỏ qua"} />
                )}
              </span>
              <span className="min-w-0 flex-1">
                {it.wordId ? (
                  <Link href={`/words/${it.wordId}`} className={cn("font-medium text-fg underline-offset-2 hover:underline", language === "zh" && "font-hanzi-sans")}>
                    {it.term}
                  </Link>
                ) : (
                  <span className={cn("font-medium text-fg", language === "zh" && "font-hanzi-sans")}>{it.term}</span>
                )}
                {it.meaning_vi && <span className="ml-2 text-sm text-fg-muted">{it.meaning_vi}</span>}
                {it.error && <span className="block text-sm text-danger-fg">{it.error}</span>}
              </span>
            </li>
          ))}
        </ul>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="space-y-2">
        <label htmlFor="import-text" className="text-sm font-medium">
          Danh sách từ
        </label>
        <textarea
          id="import-text"
          value={text}
          onChange={(e) => setText(e.target.value)}
          rows={10}
          placeholder={PLACEHOLDER[language]}
          spellCheck={false}
          className={cn(
            "w-full rounded-lg border border-border bg-surface px-4 py-3 text-base leading-8 text-fg placeholder:text-fg-muted",
            language === "zh" && "font-hanzi-sans",
          )}
          style={{
            backgroundImage: "linear-gradient(transparent calc(2rem - 1px), var(--border) calc(2rem - 1px))",
            backgroundSize: "100% 2rem",
            backgroundPositionY: "0.75rem",
          }}
        />
        <div className="flex flex-wrap gap-2">
          <input ref={fileRef} type="file" accept=".csv,.txt,.tsv,text/csv,text/plain" className="sr-only" id="import-file" onChange={(e) => readFile(e.target.files?.[0])} />
          <label htmlFor="import-file" className="inline-flex min-h-11 cursor-pointer items-center gap-2 rounded-md border border-border bg-surface px-3 text-sm font-medium hover:bg-muted">
            <FileUp className="size-4" aria-hidden />
            Tải file CSV
          </label>
          {visionEnabled && (
            <>
              <input ref={photoRef} type="file" accept="image/*" capture="environment" className="sr-only" id="import-photo" onChange={(e) => readPhoto(e.target.files?.[0])} />
              <label htmlFor="import-photo" className="inline-flex min-h-11 cursor-pointer items-center gap-2 rounded-md border border-border bg-surface px-3 text-sm font-medium hover:bg-muted">
                {ocrBusy ? <Loader2 className="size-4 animate-spin" aria-hidden /> : <Camera className="size-4" aria-hidden />}
                {ocrBusy ? "Đang đọc ảnh…" : "Chụp trang vở"}
              </label>
            </>
          )}
        </div>
        <p className="text-sm text-fg-muted">
          Định dạng: <code>từ</code>, <code>từ - nghĩa</code>, <code>từ: nghĩa</code>
          {language === "zh" && (
            <>
              , <code>苹果 píngguǒ quả táo</code>
            </>
          )}
          . Nghĩa bạn ghi sẽ được giữ nguyên.
        </p>
      </div>

      {preview && (
        <div className="space-y-3">
          <p className="flex flex-wrap gap-x-4 text-sm text-fg">
            <span className="font-medium text-success-fg">{preview.ok.length} từ hợp lệ</span>
            {preview.duplicates.length > 0 && <span className="text-fg-muted">{preview.duplicates.length} trùng</span>}
            {preview.errors.length > 0 && <span className="text-danger-fg">{preview.errors.length} lỗi</span>}
          </p>
          <ul className="divide-y divide-border max-h-80 overflow-y-auto rounded-lg border border-border bg-surface">
            {preview.lines.map((l) => (
              <li key={`${l.lineNo}-${l.raw}`} className="flex items-baseline gap-3 px-4 py-2 text-sm">
                <span className="w-6 shrink-0 text-right text-xs text-fg-muted">{l.lineNo}</span>
                <span className={cn("min-w-0 flex-1", l.status !== "ok" && "opacity-70")}>
                  <span className={cn("font-medium text-fg", language === "zh" && "font-hanzi-sans")}>{l.term || l.raw}</span>
                  {l.reading && <span className="ml-2 text-fg-muted">{l.reading}</span>}
                  {l.meaning_vi && <span className="ml-2 text-fg">— {l.meaning_vi}</span>}
                </span>
                {l.status !== "ok" && (
                  <span className={cn("shrink-0 rounded-full px-2 py-0.5 text-xs", l.status === "duplicate" ? "bg-muted text-fg-muted" : "bg-danger-soft text-danger-fg")}>
                    {l.message}
                  </span>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="flex flex-wrap gap-2">
        {aiEnabled ? (
          <Button type="button" disabled={!preview?.ok.length || running} onClick={() => start(true)} className="h-12 gap-2 rounded-md px-5 text-base lg:h-12">
            <Sparkles className="size-5" aria-hidden />
            Điền tự động & thêm {preview?.ok.length ? `${preview.ok.length} từ` : ""}
          </Button>
        ) : (
          <p className="w-full text-sm text-fg-muted">Gợi ý AI chưa bật — chỉ thêm được các dòng đã có nghĩa.</p>
        )}
        <Button
          type="button"
          variant="outline"
          disabled={!preview?.ok.some((l) => l.meaning_vi) || running}
          onClick={() => start(false)}
          className="h-12 rounded-md px-5 text-base lg:h-12"
        >
          Thêm luôn, không dùng AI
        </Button>
      </div>
    </div>
  );
}
