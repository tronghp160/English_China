"use client";

import { Loader2, MessageSquareText, Sparkles } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { useOptionalMe } from "@/components/app-shell/me-provider";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { enrichToWord, type SenseChoice } from "@/lib/ai/to-word";
import type { EnrichResult } from "@/lib/ai/schemas";
import type { LangCode } from "@/lib/lang/types";
import { POS, isPosCode } from "@/lib/pos";
import { cn } from "@/lib/utils";
import type { WordInput } from "@/lib/word-schema";

export type AiFillResult = { values: Partial<WordInput>; imageQuery: string | null };

type State =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "done"; result: EnrichResult; cached: boolean; remaining: number | null; choice: SenseChoice };

/** Hook that owns the AI suggestion request; the form renders the button and panel. */
export function useAiSuggest({
  language,
  getTerm,
  onApply,
  term,
}: {
  language: LangCode;
  getTerm: () => string;
  onApply: (r: AiFillResult) => void;
  term: string;
}) {
  const me = useOptionalMe();
  const [state, setState] = useState<State>({ status: "idle" });
  const [context, setContext] = useState("");
  const lastTerm = useRef<string>("");
  const abort = useRef<AbortController | null>(null);

  const apply = useCallback(
    (result: EnrichResult, choice: SenseChoice) => {
      onApply({ values: enrichToWord(result, choice), imageQuery: result.image_query || null });
    },
    [onApply],
  );

  const suggest = useCallback(
    async (override?: string) => {
      const t = (override ?? getTerm()).trim();
      if (!t) return;
      abort.current?.abort();
      const ctrl = new AbortController();
      abort.current = ctrl;
      lastTerm.current = t;
      setState({ status: "loading" });
      try {
        const res = await fetch("/api/ai/enrich", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ language, term: t, context: context.trim() || null }),
          signal: ctrl.signal,
        });
        const body = await res.json();
        if (!res.ok) throw new Error(body.error || "Không lấy được gợi ý.");
        const result = body.result as EnrichResult;
        setState({ status: "done", result, cached: Boolean(body.cached), remaining: body.remaining ?? null, choice: 0 });
        if (result.is_valid_word || !result.did_you_mean) apply(result, 0);
      } catch (e) {
        if ((e as Error).name === "AbortError") return;
        setState({ status: "error", message: (e as Error).message });
      }
    },
    [apply, context, getTerm, language],
  );

  // Optional auto-suggest after 600 ms without typing (off by default, §7.1).
  const auto = me?.prefs.ai_auto_suggest ?? false;
  useEffect(() => {
    if (!auto) return;
    const t = term.trim();
    if (t.length < 2 || t === lastTerm.current) return;
    const timer = setTimeout(() => void suggest(t), 600);
    return () => clearTimeout(timer);
  }, [auto, term, suggest]);

  const choose = (choice: SenseChoice) => {
    if (state.status !== "done") return;
    setState({ ...state, choice });
    apply(state.result, choice);
  };

  const reset = () => {
    abort.current?.abort();
    lastTerm.current = "";
    setState({ status: "idle" });
    setContext("");
  };

  return { state, suggest, choose, context, setContext, reset };
}

export function AiSuggestButton({ loading, onClick }: { loading: boolean; onClick: () => void }) {
  return (
    <Button
      type="button"
      onClick={onClick}
      disabled={loading}
      className="h-14 gap-2 rounded-[10px] bg-ink-blue px-4 text-base"
    >
      {loading ? <Loader2 className="size-5 animate-spin" aria-hidden /> : <Sparkles className="size-5" aria-hidden />}
      Gợi ý
    </Button>
  );
}

export function AiSuggestPanel({
  ai,
  onUseSpelling,
}: {
  ai: ReturnType<typeof useAiSuggest>;
  onUseSpelling: (term: string) => void;
}) {
  const { state, choose, context, setContext } = ai;
  const [showContext, setShowContext] = useState(false);

  return (
    <div className="-mt-3 space-y-3" aria-live="polite">
      {!showContext && state.status !== "loading" && (
        <button
          type="button"
          onClick={() => setShowContext(true)}
          className="inline-flex min-h-10 items-center gap-1.5 text-sm text-ink-soft hover:text-ink"
        >
          <MessageSquareText className="size-4" aria-hidden />
          Thêm câu bạn gặp từ này (để AI chọn đúng nghĩa)
        </button>
      )}
      {showContext && (
        <textarea
          value={context}
          onChange={(e) => setContext(e.target.value)}
          rows={2}
          maxLength={300}
          aria-label="Câu bạn gặp từ này"
          placeholder="Ví dụ: The company proved resilient during the crisis."
          className="w-full rounded-[10px] border border-rule bg-surface px-3 py-2 text-base"
        />
      )}

      {state.status === "loading" && (
        <div className="space-y-2 rounded-[12px] border border-rule bg-surface p-4" role="status">
          <p className="text-sm text-ink-soft">Đang gợi ý…</p>
          <Skeleton className="h-4 w-2/3" />
          <Skeleton className="h-4 w-1/2" />
          <Skeleton className="h-4 w-3/4" />
        </div>
      )}

      {state.status === "error" && (
        <p role="alert" className="rounded-[10px] bg-wash-red px-3 py-2 text-sm text-danger">
          {state.message}
        </p>
      )}

      {state.status === "done" && (
        <div className="space-y-3">
          {state.result.did_you_mean && (
            <div className="flex flex-wrap items-center gap-2 rounded-[10px] bg-wash-yellow px-3 py-2 text-sm text-ink">
              <span>
                Có phải bạn muốn gõ <em className="font-medium not-italic">{state.result.did_you_mean}</em>?
              </span>
              <button
                type="button"
                onClick={() => {
                  onUseSpelling(state.result.did_you_mean!);
                  void ai.suggest(state.result.did_you_mean!);
                }}
                className="min-h-9 rounded-[8px] bg-surface px-3 font-medium text-ink-blue"
              >
                Áp dụng
              </button>
            </div>
          )}

          {state.result.senses.length > 1 && (state.result.is_valid_word || !state.result.did_you_mean) && (
            <fieldset className="rounded-[12px] border border-rule bg-surface p-3">
              <legend className="px-1 text-sm font-medium text-ink">Từ này có nhiều nghĩa — chọn nghĩa chính</legend>
              <div className="mt-1 grid gap-1.5">
                {state.result.senses.map((s, i) => (
                  <label
                    key={i}
                    className={cn(
                      "flex min-h-11 cursor-pointer items-start gap-2 rounded-[10px] px-2 py-2",
                      state.choice === i && "bg-wash-blue",
                    )}
                  >
                    <input type="radio" name="sense" checked={state.choice === i} onChange={() => choose(i)} className="mt-1 accent-ink-blue" />
                    <span>
                      <span className="font-medium text-ink">{s.meaning_vi}</span>
                      <span className="ml-2 text-xs text-ink-soft">
                        {s.pos.filter(isPosCode).map((p) => POS[p].label).join(", ")}
                      </span>
                      <span className="block text-sm text-ink-soft">{s.meaning_en}</span>
                    </span>
                  </label>
                ))}
                <label
                  className={cn(
                    "flex min-h-11 cursor-pointer items-center gap-2 rounded-[10px] px-2",
                    state.choice === "merge" && "bg-wash-blue",
                  )}
                >
                  <input type="radio" name="sense" checked={state.choice === "merge"} onChange={() => choose("merge")} className="accent-ink-blue" />
                  <span className="text-sm text-ink">Gộp tất cả các nghĩa</span>
                </label>
              </div>
            </fieldset>
          )}

          {state.result.checks.pinyin_needs_review && (
            <p className="rounded-[10px] bg-wash-yellow px-3 py-2 text-sm text-ink">
              Từ có chữ đa âm — hãy kiểm tra lại pinyin.
            </p>
          )}

          <p className="text-xs text-ink-soft">
            {state.cached ? "Lấy từ bộ nhớ chung, không tốn lượt gợi ý." : "Các trường có viền vàng do AI điền — hãy xem lại."}
            {state.remaining !== null && ` Còn ${state.remaining} lượt hôm nay.`}
          </p>
        </div>
      )}
    </div>
  );
}
