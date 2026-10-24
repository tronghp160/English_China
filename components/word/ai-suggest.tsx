"use client";

import { Check, Lightbulb, Loader2, MessageSquareText } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { useOptionalMe } from "@/components/app-shell/me-provider";
import { Button } from "@/components/ui/button";
import { enrichToWord, imageSuggestions, type ImageSuggestion } from "@/lib/ai/to-word";
import type { EnrichResult } from "@/lib/ai/schemas";
import type { LangCode } from "@/lib/lang/types";
import { POS, isPosCode } from "@/lib/pos";
import { cn } from "@/lib/utils";
import type { WordInput } from "@/lib/word-schema";

export type AiFillResult = {
  values: Partial<WordInput>;
  /** One photo search per sense, chosen senses first. */
  images: ImageSuggestion[];
  /** Search to run now (the sense just picked), or null to leave the photos alone. */
  focusQuery: string | null;
};

type State =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "error"; message: string }
  | {
      status: "done";
      result: EnrichResult;
      /** "dict" = free dictionary (Wiktionary / CVDICT), shown while the AI works or instead of it. */
      source: "ai" | "dict";
      cached: boolean;
      remaining: number | null;
      chosen: number[];
      /** The AI is still working on a better answer. */
      aiPending: boolean;
      /** Why the AI answer is missing (quota, outage), shown under a dictionary result. */
      aiNote: string | null;
    };

async function postJson(url: string, body: unknown, signal: AbortSignal) {
  const res = await fetch(url, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
    signal,
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(json.error || "Không lấy được gợi ý.");
  return json;
}

/**
 * Hook that owns the suggestion requests; the form renders the button and panel.
 * The free dictionary and the AI are asked together: the dictionary fills the
 * form within a second, the AI answer (richer, with photo searches per meaning)
 * replaces it when it arrives. Without AI or quota the dictionary answer stays.
 */
export function useAiSuggest({
  language,
  getTerm,
  onApply,
  term,
  autoEnabled = true,
  aiAvailable = true,
}: {
  language: LangCode;
  getTerm: () => string;
  onApply: (r: AiFillResult) => void;
  term: string;
  /** Off when editing a saved word, so opening it never overwrites it. */
  autoEnabled?: boolean;
  /** An AI key is configured on the server; otherwise only the free dictionary is used. */
  aiAvailable?: boolean;
}) {
  const me = useOptionalMe();
  const [state, setState] = useState<State>({ status: "idle" });
  const [context, setContext] = useState("");
  const lastTerm = useRef<string>("");
  const abort = useRef<AbortController | null>(null);
  const inflight = useRef<string | null>(null);

  const apply = useCallback(
    (result: EnrichResult, chosen: number[], focus: number | null) => {
      const images = imageSuggestions(result, chosen);
      const focused = focus === null ? null : result.senses[focus];
      onApply({
        values: enrichToWord(result, chosen),
        images,
        focusQuery: focused ? focused.image_query || images[0]?.query || null : null,
      });
    },
    [onApply],
  );

  const suggest = useCallback(
    async (override?: string) => {
      const t = (override ?? getTerm()).trim();
      // Blur and a click on "Gợi ý" can both ask for the same word: send it once.
      if (!t || t === inflight.current) return;
      inflight.current = t;
      abort.current?.abort();
      const ctrl = new AbortController();
      abort.current = ctrl;
      lastTerm.current = t;
      setState({ status: "loading" });
      // With a context sentence the user wants the AI to pick the sense; skip the dictionary then.
      const useDict = !context.trim() || !aiAvailable;
      const dict: Promise<EnrichResult | null> = useDict
        ? postJson("/api/dict", { language, term: t }, ctrl.signal).then(
            (b) => (b.result as EnrichResult | null) ?? null,
            () => null,
          )
        : Promise.resolve(null);
      let aiDone = false;
      let dictShown = false;
      const showDict = (result: EnrichResult, aiPending: boolean, aiNote: string | null) => {
        setState({ status: "done", result, source: "dict", cached: false, remaining: null, chosen: [0], aiPending, aiNote });
        apply(result, [0], 0);
        dictShown = true;
      };
      void dict.then((r) => {
        if (r && !aiDone && !ctrl.signal.aborted) showDict(r, aiAvailable, null);
      });

      try {
        if (!aiAvailable) {
          const r = await dict;
          if (!r && !ctrl.signal.aborted) {
            setState({ status: "error", message: "Từ điển miễn phí chưa có từ này. Bạn tự nhập nhé." });
          }
          return;
        }
        const body = await postJson("/api/ai/enrich", { language, term: t, context: context.trim() || null }, ctrl.signal);
        aiDone = true;
        const result = body.result as EnrichResult;
        setState({
          status: "done",
          result,
          source: "ai",
          cached: Boolean(body.cached),
          remaining: body.remaining ?? null,
          chosen: [0],
          aiPending: false,
          aiNote: null,
        });
        if (result.is_valid_word || !result.did_you_mean) apply(result, [0], 0);
      } catch (e) {
        aiDone = true;
        if ((e as Error).name === "AbortError" || ctrl.signal.aborted) return;
        const r = await dict;
        if (ctrl.signal.aborted) return;
        const note = `${(e as Error).message} Đang dùng gợi ý từ từ điển miễn phí.`;
        if (!r) setState({ status: "error", message: (e as Error).message });
        else if (dictShown) setState((s) => (s.status === "done" ? { ...s, aiPending: false, aiNote: note } : s));
        else showDict(r, false, note);
      } finally {
        if (inflight.current === t) inflight.current = null;
      }
    },
    [aiAvailable, apply, context, getTerm, language],
  );

  // Suggest on its own once typing pauses (setting "Tự gợi ý khi ngừng gõ", on by default).
  // Chinese words can be a single character; English needs 2 letters.
  const auto = autoEnabled && (me?.prefs.ai_autofill ?? true);
  const minLength = language === "zh" ? 1 : 2;
  // `suggest` changes identity on most renders (getTerm is inline), so the timer
  // reads it from a ref; otherwise every re-render would restart the pause.
  const suggestRef = useRef(suggest);
  useEffect(() => {
    suggestRef.current = suggest;
  }, [suggest]);
  useEffect(() => {
    if (!auto) return;
    const t = term.trim();
    if (t.length < minLength || t === lastTerm.current) return;
    const timer = setTimeout(() => void suggestRef.current(t), 900);
    return () => clearTimeout(timer);
  }, [auto, minLength, term]);

  /** Leaving the word field suggests at once instead of waiting for the pause. */
  const suggestIfNew = useCallback(() => {
    const t = getTerm().trim();
    if (auto && t.length >= minLength && t !== lastTerm.current) void suggest(t);
  }, [auto, getTerm, minLength, suggest]);

  /** Tick or untick a sense; at least one stays chosen. */
  const toggle = (i: number) => {
    if (state.status !== "done") return;
    const on = state.chosen.includes(i);
    if (on && state.chosen.length === 1) return;
    const chosen = on ? state.chosen.filter((x) => x !== i) : [...state.chosen, i].sort((a, b) => a - b);
    setState({ ...state, chosen });
    apply(state.result, chosen, on ? null : i);
  };

  const chooseAll = () => {
    if (state.status !== "done") return;
    const chosen = state.result.senses.map((_, i) => i);
    setState({ ...state, chosen });
    apply(state.result, chosen, null);
  };

  const reset = () => {
    abort.current?.abort();
    inflight.current = null;
    lastTerm.current = "";
    setState({ status: "idle" });
    setContext("");
  };

  return { state, suggest, suggestIfNew, toggle, chooseAll, context, setContext, reset, aiAvailable };
}

export function AiSuggestButton({ loading, onClick }: { loading: boolean; onClick: () => void }) {
  return (
    <Button type="button" onClick={onClick} disabled={loading} className="h-14 px-5">
      {loading ? <Loader2 className="animate-spin" aria-hidden /> : <Lightbulb aria-hidden />}
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
  const { state, toggle, chooseAll, context, setContext } = ai;
  const [showContext, setShowContext] = useState(false);

  const credit =
    state.status !== "done" || state.source !== "dict"
      ? null
      : state.result.language === "zh"
        ? { name: "CVDICT", href: "https://github.com/ph0ngp/CVDICT" }
        : { name: "Wiktionary", href: "https://vi.wiktionary.org" };

  return (
    <div className="space-y-2.5" aria-live="polite">
      {state.status === "loading" && (
        <p role="status" className="flex items-center gap-2 px-1 text-sm text-fg-muted">
          <Loader2 className="size-4 animate-spin" aria-hidden />
          Đang tìm phiên âm, nghĩa và ví dụ…
        </p>
      )}

      {state.status === "error" && (
        <p role="alert" className="rounded-md border-l-[3px] border-danger bg-danger-soft px-3 py-2 text-sm text-danger-fg">
          {state.message}
        </p>
      )}

      {state.status === "done" && (
        <>
          {state.result.did_you_mean && (
            <div className="flex flex-wrap items-center gap-2 rounded-md bg-streak-soft px-3 py-2 text-sm text-fg">
              <span>
                Có phải bạn muốn gõ <em className="font-medium not-italic">{state.result.did_you_mean}</em>?
              </span>
              <button
                type="button"
                onClick={() => {
                  onUseSpelling(state.result.did_you_mean!);
                  void ai.suggest(state.result.did_you_mean!);
                }}
                className="min-h-9 rounded-md bg-surface px-3 font-medium text-primary"
              >
                Áp dụng
              </button>
            </div>
          )}

          {state.result.senses.length > 1 && (state.result.is_valid_word || !state.result.did_you_mean) && (
            <fieldset>
              <legend className="mb-1.5 px-1 text-sm text-fg-muted">
                {state.result.senses.length} nghĩa, chạm để chọn nghĩa muốn lưu
              </legend>
              <div className="flex flex-wrap gap-2">
                {state.result.senses.map((s, i) => {
                  const on = state.chosen.includes(i);
                  const pos = s.pos.filter(isPosCode).map((p) => POS[p].label).join(", ");
                  return (
                    <label
                      key={i}
                      title={[s.meaning_en, s.examples[0]?.text].filter(Boolean).join(" — ")}
                      className={cn(
                        "inline-flex min-h-10 max-w-full cursor-pointer items-center gap-1.5 rounded-full border px-3 text-sm transition-colors has-focus-visible:outline-2 has-focus-visible:outline-offset-2 has-focus-visible:outline-primary",
                        on ? "border-primary bg-primary-soft text-fg" : "border-input bg-surface text-fg-muted hover:text-fg",
                      )}
                    >
                      <input type="checkbox" checked={on} onChange={() => toggle(i)} className="sr-only" />
                      {on && <Check className="size-3.5 shrink-0 text-primary" strokeWidth={2.5} aria-hidden />}
                      <span className="truncate font-medium">{s.meaning_vi}</span>
                      {pos && <span className="shrink-0 text-xs text-fg-muted">{pos}</span>}
                    </label>
                  );
                })}
                {state.chosen.length < state.result.senses.length && (
                  <button
                    type="button"
                    onClick={chooseAll}
                    className="min-h-10 rounded-full px-2 text-sm font-medium text-primary hover:underline"
                  >
                    Chọn tất cả
                  </button>
                )}
              </div>
            </fieldset>
          )}

          {state.result.checks.pinyin_needs_review && (
            <p className="rounded-md bg-streak-soft px-3 py-2 text-sm text-fg">Từ có chữ đa âm, hãy kiểm tra lại pinyin.</p>
          )}
          {state.aiNote && <p className="rounded-md bg-streak-soft px-3 py-2 text-sm text-fg">{state.aiNote}</p>}

          <p className="flex items-start gap-1.5 px-1 text-sm text-fg-muted">
            {state.aiPending && <Loader2 className="mt-0.5 size-3.5 shrink-0 animate-spin" aria-hidden />}
            <span>
              {state.aiPending ? "AI đang bổ sung thêm. " : ""}
              Đã điền
              {credit ? (
                <>
                  {" "}từ{" "}
                  <a href={credit.href} target="_blank" rel="noopener noreferrer" className="underline underline-offset-2">
                    {credit.name}
                  </a>{" "}
                  (CC BY-SA)
                </>
              ) : state.source === "ai" ? (
                " bằng AI"
              ) : null}
              {state.source === "ai" && state.cached ? ", không tốn lượt" : ""}. Xem lại trước khi lưu.
              {state.remaining !== null && ` Còn ${state.remaining} lượt AI hôm nay.`}
            </span>
          </p>
        </>
      )}

      {ai.aiAvailable &&
        state.status !== "loading" &&
        (showContext ? (
          <textarea
            value={context}
            onChange={(e) => setContext(e.target.value)}
            rows={2}
            maxLength={300}
            aria-label="Câu bạn gặp từ này"
            placeholder="Câu bạn gặp từ này, ví dụ: The company proved resilient during the crisis."
            className="w-full rounded-md border border-input bg-surface px-3 py-2 text-base outline-none focus-visible:border-primary focus-visible:ring-3 focus-visible:ring-primary-soft"
          />
        ) : (
          <button
            type="button"
            onClick={() => setShowContext(true)}
            className="inline-flex min-h-10 items-center gap-1.5 px-1 text-sm text-fg-muted hover:text-fg"
          >
            <MessageSquareText className="size-4" aria-hidden />
            Thêm câu bạn gặp từ này để chọn đúng nghĩa
          </button>
        ))}
    </div>
  );
}
