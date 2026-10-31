"use client";

import { AlertCircle, FileSpreadsheet, Loader2, Plus } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState, useTransition } from "react";
import { useFieldArray, useForm, useWatch } from "react-hook-form";
import { toast } from "sonner";
import { LangMark } from "@/components/lang-mark";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Sheet, SheetContent, SheetFooter, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Textarea } from "@/components/ui/textarea";
import { createWordsBulk } from "@/lib/actions/words";
import { enqueueEnrich } from "@/lib/ai/enrich-queue";
import { lookupWord } from "@/lib/ai/lookup-client";
import type { EnrichResult } from "@/lib/ai/schemas";
import { enrichToWord, imageSuggestions } from "@/lib/ai/to-word";
import {
  applyInitialTerm,
  clearDraft,
  loadDraft,
  saveDraft,
} from "@/lib/compose-draft";
import {
  cardsToSave,
  findInnerDuplicates,
  isBlank,
  MAX_CARDS,
  pasteToCards,
  saveLabel,
} from "@/lib/compose";
import type { ParsedLine } from "@/lib/import-parser";
import type { LangCode } from "@/lib/lang/types";
import { cn } from "@/lib/utils";
import { cleanWordInput } from "@/lib/word-clean";
import { emptyWord, wordInputSchema, type WordData, type WordInput } from "@/lib/word-schema";
import type { DetailTab } from "@/lib/word-summary";
import { ComposeCard, type CardMeta } from "./compose-card";
import { WordDetails } from "./word-details";

export type WordComposerProps = {
  deckId: string;
  language: LangCode;
  targets: { id: string; name: string }[];
  userId: string;
  initialTerm?: string;
  initialMode?: "cards" | "list";
  aiEnabled: boolean;
};

type ComposeForm = {
  cards: WordInput[];
};

function defaultMeta(): CardMeta {
  return {
    images: [],
    source: null,
    aiMeaning: null,
    meaningTouched: false,
    readingTyped: false,
    duplicates: [],
    batch: false,
    saveError: null,
  };
}

export function WordComposer({
  deckId,
  language,
  targets,
  userId,
  initialTerm,
  initialMode = "cards",
  aiEnabled,
}: WordComposerProps) {
  const router = useRouter();
  const [targetDeckId, setTargetDeckId] = useState(deckId);
  const [mode, setMode] = useState<"cards" | "list">(initialMode);
  const [listText, setListText] = useState("");
  const [listErrors, setListErrors] = useState<ParsedLine[]>([]);
  const [openDetail, setOpenDetail] = useState<{ key: string; tab: DetailTab } | null>(null);
  const [discardAlertOpen, setDiscardAlertOpen] = useState(false);
  const [restoredDraft, setRestoredDraft] = useState(false);
  const [batchProgress, setBatchProgress] = useState<{ current: number; total: number } | null>(null);
  const [pending, startTransition] = useTransition();

  const [cardMetas, setCardMetas] = useState<Record<string, CardMeta>>({});

  const form = useForm<ComposeForm>({
    defaultValues: { cards: [emptyWord()] },
  });

  const { fields, append, remove, insert, replace, update } = useFieldArray({
    control: form.control,
    name: "cards",
    keyName: "key",
  });

  const fieldsRef = useRef(fields);
  useEffect(() => {
    fieldsRef.current = fields;
  });

  const watchedCards = useWatch({ control: form.control, name: "cards" });

  const getMeta = useCallback(
    (key: string): CardMeta => {
      return cardMetas[key] ?? defaultMeta();
    },
    [cardMetas],
  );

  const updateMeta = useCallback((key: string, patch: Partial<CardMeta>) => {
    setCardMetas((prev) => ({
      ...prev,
      [key]: { ...(prev[key] ?? defaultMeta()), ...patch },
    }));
  }, []);

  // Restore draft on mount or apply initialTerm
  useEffect(() => {
    const draft = loadDraft(userId, deckId);
    if (draft && draft.length > 0) {
      const merged = applyInitialTerm(draft, initialTerm);
      replace(merged);
      queueMicrotask(() => setRestoredDraft(true));
      if (initialTerm) {
        requestAnimationFrame(() => form.setFocus(`cards.${merged.length - 1}.meaning_vi`));
      }
    } else if (initialTerm) {
      const initialCards = applyInitialTerm([emptyWord()], initialTerm);
      replace(initialCards);
      requestAnimationFrame(() => form.setFocus("cards.0.meaning_vi"));
    }
  }, [userId, deckId, initialTerm, replace, form]);

  // Debounced auto-save draft
  useEffect(() => {
    const timer = setTimeout(() => {
      if (watchedCards && watchedCards.length > 0) {
        saveDraft(userId, deckId, watchedCards);
      }
    }, 800);
    return () => clearTimeout(timer);
  }, [watchedCards, userId, deckId]);

  const innerDuplicates = useMemo(
    () => findInnerDuplicates(watchedCards ?? []),
    [watchedCards],
  );

  // Detail Sheet Form
  const detailForm = useForm<WordInput, unknown, WordData>({
    defaultValues: emptyWord(),
  });

  const openKey = openDetail?.key;
  const openIndex = openKey ? fields.findIndex((f) => f.key === openKey) : -1;
  const currentCardForDetail = openIndex >= 0 ? form.getValues(`cards.${openIndex}`) : null;

  function handleOpenDetail(index: number, tab: DetailTab) {
    const key = fields[index]?.key;
    if (!key) return;
    const cardData = form.getValues(`cards.${index}`);
    detailForm.reset(cardData);
    setOpenDetail({ key, tab });
  }

  function handleFinishDetail() {
    if (!openKey) return;
    const idx = fields.findIndex((f) => f.key === openKey);
    if (idx >= 0) {
      const updated = {
        ...form.getValues(`cards.${idx}`),
        ...detailForm.getValues(),
      };
      form.setValue(`cards.${idx}`, updated, { shouldDirty: true });
    }
    setOpenDetail(null);
  }

  function handleRequestCloseDetail() {
    if (detailForm.formState.isDirty) {
      setDiscardAlertOpen(true);
    } else {
      setOpenDetail(null);
    }
  }

  // Save handler declared early
  const handleSave = useCallback(() => {
    const allCards = form.getValues("cards");
    const toSave = cardsToSave(allCards);
    if (!toSave.length) return;

    let firstErrorIndex: number | null = null;
    let hasError = false;

    toSave.forEach(({ index, value }) => {
      const cleaned = cleanWordInput(value);
      const parsed = wordInputSchema.safeParse(cleaned);
      const key = fields[index]?.key;

      if (!parsed.success) {
        hasError = true;
        if (firstErrorIndex === null) firstErrorIndex = index;
        if (key) {
          updateMeta(key, { meaningTouched: true });
        }
        parsed.error.issues.forEach((issue) => {
          const path = issue.path[0];
          form.setError(`cards.${index}.${path as keyof WordInput}` as never, {
            message: issue.message,
          });
        });
      } else {
        if (key) {
          updateMeta(key, { saveError: null });
        }
      }
    });

    if (hasError && firstErrorIndex !== null) {
      toast.error("Kiểm tra lại các thẻ được đánh dấu.");
      const el = document.getElementById(`card-${firstErrorIndex}`);
      el?.scrollIntoView({ behavior: "smooth", block: "center" });
      return;
    }

    startTransition(async () => {
      const CHUNK_SIZE = 30;
      const validCards = toSave.map((s) => s.value);
      const indicesToSave = toSave.map((s) => s.index);

      let allInserted: { id: string; term: string }[] = [];
      const skippedTerms = new Set<string>();
      const invalidTerms = new Set<string>();

      for (let i = 0; i < validCards.length; i += CHUNK_SIZE) {
        const chunk = validCards.slice(i, i + CHUNK_SIZE).map((c) => cleanWordInput(c));
        const res = await createWordsBulk(targetDeckId, chunk);
        if (!res.ok) {
          toast.error(res.error);
          return;
        }
        allInserted = allInserted.concat(res.data.inserted);
        res.data.skipped.forEach((t) => skippedTerms.add(t));
        res.data.invalid.forEach((t) => invalidTerms.add(t));
      }

      const insertedTerms = new Set(allInserted.map((w) => w.term));

      const toRemove: number[] = [];
      indicesToSave.forEach((idx) => {
        const term = form.getValues(`cards.${idx}.term`);
        const key = fieldsRef.current[idx]?.key;
        if (insertedTerms.has(term)) {
          toRemove.push(idx);
        } else if (skippedTerms.has(term)) {
          if (key) updateMeta(key, { saveError: "Đã có trong bộ này" });
        } else if (invalidTerms.has(term)) {
          if (key) updateMeta(key, { saveError: "Dữ liệu chưa hợp lệ" });
        }
      });

      toRemove.sort((a, b) => b - a).forEach((idx) => remove(idx));

      if (allInserted.length === 1) {
        const saved = allInserted[0];
        toast.success(`Đã lưu ${saved.term}`, {
          action: { label: "Xem", onClick: () => router.push(`/words/${saved.id}`) },
        });
      } else if (allInserted.length > 1) {
        toast.success(`Đã lưu ${allInserted.length} từ`, {
          action: { label: "Xem bộ", onClick: () => router.push(`/decks/${targetDeckId}`) },
        });
      }

      const remainingCards = form.getValues("cards");
      if (remainingCards.length === 0 || remainingCards.every(isBlank)) {
        replace([emptyWord()]);
        clearDraft(userId, deckId);
        requestAnimationFrame(() => form.setFocus("cards.0.term"));
      }
    });
  }, [deckId, fields, form, remove, replace, router, targetDeckId, updateMeta, userId]);

  // Keyboard shortcut Ctrl/Cmd + Enter to save
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
        e.preventDefault();
        handleSave();
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleSave]);

  // Batch enrichment for pasted or bulk cards
  const runBatchEnrich = useCallback(
    async (startIndex: number, items: WordInput[]) => {
      if (items.length <= 0) return;
      setBatchProgress({ current: 0, total: items.length });
      let completed = 0;
      let warned = false;

      const fill = (cardIdx: number, result: EnrichResult, source: "ai" | "dict") => {
        const filled = enrichToWord(result, 0);
        const currentMeaning = form.getValues(`cards.${cardIdx}.meaning_vi`)?.trim();
        const currentReading = form.getValues(`cards.${cardIdx}.reading`)?.trim();
        for (const [k, v] of Object.entries(filled)) {
          if (v === undefined) continue;
          if (k === "meaning_vi" && currentMeaning) continue;
          if (k === "reading" && currentReading) continue;
          form.setValue(`cards.${cardIdx}.${k as keyof WordInput}` as never, v as never, { shouldDirty: true });
        }
        if (source === "ai") form.setValue(`cards.${cardIdx}.ai_generated` as never, true as never);
        const cardKey = fieldsRef.current[cardIdx]?.key;
        if (cardKey) updateMeta(cardKey, { images: imageSuggestions(result, [0]), source });
      };
      const step = () => {
        completed++;
        setBatchProgress({ current: Math.min(completed, items.length), total: items.length });
      };

      if (aiEnabled) {
        // Every word goes through the page-wide AI queue: batches of 10, shared
        // with the single cards, same handling of repeats, "busy" and quota.
        await Promise.all(
          items.map(async (c, i) => {
            const term = c.term?.trim() ?? "";
            if (term) {
              const r = await enqueueEnrich({ language, term, meaning_vi: c.meaning_vi?.trim() || null, urgent: true });
              if (r.ok) fill(startIndex + i, r.result, "ai");
              else if (!warned && r.code !== "aborted") {
                warned = true;
                toast.error(r.error || "Lỗi khi điền gợi ý.");
              }
            }
            step();
          }),
        );
      } else {
        // No AI: the free lookup (browser memory, shared AI cache, dictionary), three at a time.
        const queue = items.map((c, i) => ({ term: c.term?.trim() ?? "", cardIdx: startIndex + i }));
        const worker = async () => {
          for (let job = queue.shift(); job; job = queue.shift()) {
            if (job.term) {
              try {
                const found = await lookupWord(language, job.term);
                if (found.result) fill(job.cardIdx, found.result, found.source === "dict" ? "dict" : "ai");
              } catch {}
            }
            step();
          }
        };
        await Promise.all([worker(), worker(), worker()]);
      }
      setBatchProgress(null);
    },
    [aiEnabled, form, language, updateMeta],
  );

  function handleCardPaste(index: number, text: string) {
    const { cards: newCards } = pasteToCards(text, language);
    if (!newCards.length) return;

    const currentCard = form.getValues(`cards.${index}`);
    const currentIsBlank = isBlank(currentCard);

    let allowed = newCards;
    if (fields.length + newCards.length - (currentIsBlank ? 1 : 0) > MAX_CARDS) {
      toast.error(`Mỗi lần tối đa ${MAX_CARDS} từ.`);
      const remainingCapacity = MAX_CARDS - (fields.length - (currentIsBlank ? 1 : 0));
      allowed = newCards.slice(0, Math.max(0, remainingCapacity));
    }
    if (!allowed.length) return;

    let insertAt = index;
    if (currentIsBlank) {
      if (fields.length === 1) {
        replace(allowed);
        insertAt = 0;
      } else {
        update(index, allowed[0]);
        if (allowed.length > 1) {
          insert(index + 1, allowed.slice(1));
        }
      }
    } else {
      insertAt = index + 1;
      insert(insertAt, allowed);
    }

    toast.success(`Đã tách thành ${allowed.length} thẻ`);
    void runBatchEnrich(insertAt, allowed);
  }

  function handleParseList() {
    if (!listText.trim()) return;
    const { cards: parsedCards, errors } = pasteToCards(listText, language);
    setListErrors(errors);

    if (!parsedCards.length) {
      if (errors.length) toast.error("Không tìm thấy dòng từ hợp lệ.");
      return;
    }

    let allowed = parsedCards;
    const lastCard = form.getValues(`cards.${fields.length - 1}`);
    const dropLast = fields.length === 1 && isBlank(lastCard);

    if (fields.length - (dropLast ? 1 : 0) + allowed.length > MAX_CARDS) {
      toast.error(`Mỗi lần tối đa ${MAX_CARDS} từ.`);
      const capacity = MAX_CARDS - (fields.length - (dropLast ? 1 : 0));
      allowed = allowed.slice(0, Math.max(0, capacity));
    }
    if (!allowed.length) return;

    let startIndex = fields.length;
    if (dropLast) {
      replace(allowed);
      startIndex = 0;
    } else {
      insert(startIndex, allowed);
    }

    toast.success(`Đã tách thành ${allowed.length} thẻ`);
    setListText("");
    setMode("cards");
    void runBatchEnrich(startIndex, allowed);
  }

  function handleDelete(index: number) {
    if (fields.length <= 1) return;
    const removedCard = form.getValues(`cards.${index}`);
    remove(index);

    toast("Đã xóa thẻ", {
      action: {
        label: "Hoàn tác",
        onClick: () => insert(index, removedCard),
      },
    });
  }

  function handleClearDraft() {
    clearDraft(userId, deckId);
    replace([emptyWord()]);
    setRestoredDraft(false);
    toast.success("Đã xóa nháp");
  }

  const validCount = (watchedCards ?? []).filter(
    (c) => Boolean(c.term?.trim()) && Boolean(c.meaning_vi?.trim()),
  ).length;

  const incompleteCount = (watchedCards ?? []).filter(
    (c) => Boolean(c.term?.trim()) && !c.meaning_vi?.trim(),
  ).length;

  return (
    <div className="flex flex-col gap-6 pb-28 lg:pb-12">
      {/* Title & Target Deck Row */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-xl font-bold sm:text-2xl">Thêm từ</h1>

        {targets.length > 1 && (
          <div className="flex items-center gap-2">
            <span className="text-xs text-fg-muted shrink-0">Vào bộ:</span>
            <Select value={targetDeckId} onValueChange={setTargetDeckId}>
              <SelectTrigger size="sm" aria-label="Vào bộ" className="max-w-56 text-xs">
                <SelectValue placeholder="Chọn bộ từ" />
              </SelectTrigger>
              <SelectContent>
                {targets.map((t) => (
                  <SelectItem key={t.id} value={t.id} className="text-xs">
                    <span className="flex items-center gap-1.5">
                      <LangMark lang={language} />
                      <span className="truncate">{t.name}</span>
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}
      </div>

      {/* Mode Switcher */}
      <div className="inline-flex max-w-full flex-wrap gap-1 rounded-full bg-surface-2 p-1">
        <button
          type="button"
          onClick={() => setMode("cards")}
          className={cn(
            "inline-flex h-9 items-center rounded-full px-4 text-sm font-semibold transition-colors",
            mode === "cards" ? "bg-surface text-fg shadow-sm" : "text-fg-muted hover:text-fg",
          )}
        >
          Từng thẻ
        </button>
        <button
          type="button"
          onClick={() => setMode("list")}
          className={cn(
            "inline-flex h-9 items-center rounded-full px-4 text-sm font-semibold transition-colors",
            mode === "list" ? "bg-surface text-fg shadow-sm" : "text-fg-muted hover:text-fg",
          )}
        >
          Dán danh sách
        </button>
      </div>

      {/* Mode A: Cards List */}
      {mode === "cards" && (
        <div className="flex flex-col gap-4">
          {/* Restored Draft Banner */}
          {restoredDraft && (
            <div className="flex items-center justify-between rounded-lg bg-surface-2 px-3.5 py-2 text-sm text-fg-muted">
              <span>Đã khôi phục {fields.length} thẻ chưa lưu.</span>
              <button
                type="button"
                onClick={handleClearDraft}
                className="font-semibold text-primary hover:underline"
              >
                Xóa nháp
              </button>
            </div>
          )}

          {/* Cards List */}
          {fields.map((field, idx) => (
            <ComposeCard
              key={field.key}
              index={idx}
              form={form}
              meta={getMeta(field.key)}
              onMeta={(patch) => updateMeta(field.key, patch)}
              language={language}
              aiAvailable={aiEnabled}
              canDelete={fields.length > 1}
              onDelete={handleDelete}
              onOpenDetail={handleOpenDetail}
              innerDuplicateIndex={innerDuplicates.get(idx)}
              onCardPaste={handleCardPaste}
              isLastCard={idx === fields.length - 1}
              onEnterAtEnd={() => {
                if (fields.length < MAX_CARDS) {
                  append(emptyWord());
                  requestAnimationFrame(() => form.setFocus(`cards.${fields.length}.term`));
                }
              }}
              disabled={pending}
            />
          ))}

          {/* Add Card Button */}
          <button
            type="button"
            disabled={fields.length >= MAX_CARDS || pending}
            onClick={() => {
              if (fields.length < MAX_CARDS) {
                append(emptyWord());
                requestAnimationFrame(() => form.setFocus(`cards.${fields.length}.term`));
              }
            }}
            className={cn(
              "flex min-h-12 w-full items-center justify-center gap-2 rounded-xl border-2 border-dashed border-border-strong bg-transparent text-sm font-semibold text-fg-muted transition-colors hover:border-primary hover:text-primary",
              fields.length >= MAX_CARDS && "opacity-50 cursor-not-allowed",
            )}
          >
            <Plus className="size-4" aria-hidden />
            {fields.length >= MAX_CARDS ? `Tối đa ${MAX_CARDS} thẻ mỗi lần` : "Thêm thẻ"}
          </button>
        </div>
      )}

      {/* Mode B: Paste List */}
      {mode === "list" && (
        <Card className="flex flex-col gap-4 p-5">
          <div>
            <label htmlFor="list-textarea" className="block text-sm font-semibold text-fg">
              Danh sách từ
            </label>
            <p className="mt-0.5 text-xs text-fg-muted">
              Mỗi dòng một từ, có thể kèm dấu gạch ngang và nghĩa. AI sẽ điền các thông tin còn lại.
            </p>
          </div>

          <Textarea
            id="list-textarea"
            rows={8}
            value={listText}
            onChange={(e) => setListText(e.target.value)}
            placeholder={
              language === "zh"
                ? "苹果 píngguǒ quả táo\n坚强"
                : "apple - quả táo\nresilient\nborrow: mượn"
            }
            className="font-mono text-sm"
          />

          {listErrors.length > 0 && (
            <ul className="flex flex-col gap-1 text-xs text-danger-fg">
              {listErrors.map((err) => (
                <li key={err.lineNo} className="flex items-center gap-1.5">
                  <AlertCircle className="size-3.5 shrink-0" aria-hidden />
                  <span>
                    Dòng {err.lineNo}: {err.message} ({err.raw})
                  </span>
                </li>
              ))}
            </ul>
          )}

          <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
            <Link
              href={`/decks/${targetDeckId}/import`}
              className="inline-flex min-h-10 items-center gap-1.5 text-xs text-primary hover:underline"
            >
              <FileSpreadsheet className="size-4" aria-hidden />
              Nhập từ ảnh hoặc file CSV
            </Link>

            <Button
              type="button"
              onClick={handleParseList}
              disabled={!listText.trim()}
              className="h-10 px-5 text-sm"
            >
              Tách thành thẻ
            </Button>
          </div>
        </Card>
      )}

      {/* Sticky Save Bar */}
      <div className="fixed inset-x-0 bottom-[calc(4.5rem+env(safe-area-inset-bottom))] z-20 border-t border-border bg-surface px-4 py-3 shadow-lg lg:sticky lg:bottom-4 lg:mx-0 lg:rounded-xl lg:border lg:shadow-md">
        <div className="mx-auto flex max-w-3xl items-center justify-between gap-3">
          <div className="flex flex-col text-xs sm:text-sm">
            {batchProgress ? (
              <span className="flex items-center gap-2 text-primary font-medium">
                <Loader2 className="size-4 animate-spin shrink-0" aria-hidden />
                Đang điền {batchProgress.current}/{batchProgress.total}…
              </span>
            ) : (
              <span className="text-fg-muted font-medium">
                {validCount} thẻ sẵn sàng
                {incompleteCount > 0 && ` · ${incompleteCount} thẻ thiếu nghĩa`}
              </span>
            )}
          </div>

          <Button
            type="button"
            size="lg"
            disabled={validCount === 0 || pending}
            onClick={handleSave}
            className="min-w-32"
          >
            {pending && <Loader2 className="size-4 animate-spin" aria-hidden />}
            {saveLabel(validCount)}
          </Button>
        </div>
      </div>

      {/* Details Sheet */}
      <Sheet open={openDetail !== null} onOpenChange={(open) => !open && handleRequestCloseDetail()}>
        <SheetContent side="right" className="flex h-full flex-col sm:max-w-xl">
          <SheetHeader className="border-b border-border pb-3">
            <SheetTitle>
              {currentCardForDetail?.term?.trim() || (openIndex >= 0 ? `Thẻ ${openIndex + 1}` : "Chi tiết")}
            </SheetTitle>
          </SheetHeader>

          <div className="flex-1 overflow-y-auto px-4 py-3">
            <WordDetails
              form={detailForm}
              language={language}
              userId={userId}
              images={openKey ? getMeta(openKey).images : []}
              tab={openDetail?.tab}
              onTabChange={(t) => openKey && setOpenDetail({ key: openKey, tab: t })}
            />
          </div>

          <SheetFooter className="border-t border-border pt-3">
            <Button type="button" onClick={handleFinishDetail} className="w-full">
              Xong
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>

      {/* Discard Details Alert Dialog */}
      <AlertDialog open={discardAlertOpen} onOpenChange={setDiscardAlertOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Bỏ thay đổi chi tiết?</AlertDialogTitle>
            <AlertDialogDescription>
              Các thay đổi bạn vừa nhập trong bảng chi tiết sẽ không được lưu vào thẻ.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Tiếp tục sửa</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                setDiscardAlertOpen(false);
                setOpenDetail(null);
              }}
            >
              Bỏ thay đổi
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
