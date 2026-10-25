"use client";

import { Lightbulb, Loader2, MessageSquareText, Sparkles } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { useOptionalMe } from "@/components/app-shell/me-provider";
import { Button } from "@/components/ui/button";
import { getCached } from "@/lib/ai/client-cache";
import { enqueueEnrich, subscribe } from "@/lib/ai/enrich-queue";
import { lookupWord } from "@/lib/ai/lookup-client";
import { decideNextStep } from "@/lib/ai/suggest-policy";
import { enrichToWord, imageSuggestions, type ImageSuggestion } from "@/lib/ai/to-word";
import type { EnrichResult } from "@/lib/ai/schemas";
import type { LangCode } from "@/lib/lang/types";
import type { WordInput } from "@/lib/word-schema";
import { SenseChips } from "./sense-chips";

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

/** Seconds left on the AI queue's "busy" wait, or null. */
function useBusySeconds() {
  const [seconds, setSeconds] = useState<number | null>(null);
  useEffect(
    () =>
      subscribe(({ busyUntil }) =>
        setSeconds(busyUntil ? Math.max(1, Math.ceil((busyUntil - Date.now()) / 1000)) : null),
      ),
    [],
  );
  return seconds;
}

/**
 * Hook that owns the suggestion requests; the form renders the button and panel.
 * Dictionary first: the tab's memory, then /api/lookup (an AI answer someone
 * already paid for, else the free dictionary) fills the form within a second.
 * The AI is only asked when that had no AI answer, through the page-wide batch
 * queue (lib/ai/enrich-queue.ts), and its answer replaces the dictionary one.
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
  const busySeconds = useBusySeconds();
  // Suggest on its own once typing pauses (setting "Tự gợi ý khi ngừng gõ", on by default).
  const auto = autoEnabled && (me?.prefs.ai_autofill ?? true);

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

  const showAi = useCallback(
    (result: EnrichResult, cached: boolean, remaining: number | null) => {
      setState({ status: "done", result, source: "ai", cached, remaining, chosen: [0], aiPending: false, aiNote: null });
      if (result.is_valid_word || !result.did_you_mean) apply(result, [0], 0);
    },
    [apply],
  );

  /** AI answer from the batch queue; the dictionary answer (if shown) stays until it arrives. */
  const askQueue = useCallback(
    async (t: string, ctrl: AbortController, urgent: boolean, shown: boolean) => {
      const r = await enqueueEnrich({ language, term: t, urgent, signal: ctrl.signal });
      if (ctrl.signal.aborted || lastTerm.current !== t || (!r.ok && r.code === "aborted")) return;
      if (r.ok) return showAi(r.result, r.cached, null);
      const quota = r.code === "quota_user" || r.code === "quota_global";
      const note = quota ? r.error : `${r.error} Đang dùng gợi ý từ từ điển miễn phí.`;
      if (shown) setState((s) => (s.status === "done" ? { ...s, aiPending: false, aiNote: note } : s));
      else setState({ status: "error", message: r.error });
    },
    [language, showAi],
  );

  const suggest = useCallback(
    async (override?: string, urgent = true) => {
      const t = (override ?? getTerm()).trim();
      // Blur and a click on "Gợi ý" can both ask for the same word: send it once.
      if (!t || t === inflight.current) return;
      inflight.current = t;
      abort.current?.abort();
      const ctrl = new AbortController();
      abort.current = ctrl;
      lastTerm.current = t;
      const ctx = context.trim();
      try {
        // With a context sentence the user wants the AI to pick the sense: one direct
        // call, kept out of the batches and the caches (the answer depends on the sentence).
        if (decideNextStep(null, { aiAvailable, auto, urgent, hasContext: Boolean(ctx) }).kind === "direct") {
          setState({ status: "loading" });
          const body = await postJson("/api/ai/enrich", { language, term: t, context: ctx }, ctrl.signal);
          showAi(body.result as EnrichResult, Boolean(body.cached), body.remaining ?? null);
          return;
        }

        if (!getCached(language, t)) setState({ status: "loading" });
        const found = await lookupWord(language, t, ctrl.signal);
        if (ctrl.signal.aborted) return;
        const step = decideNextStep(found.source, { aiAvailable, auto, urgent, hasContext: false });
        const result = found.result;
        if (result && found.source !== "dict") {
          showAi(result, true, null);
        } else if (result) {
          setState({
            status: "done",
            result,
            source: "dict",
            cached: false,
            remaining: null,
            chosen: [0],
            aiPending: step.kind === "queue",
            aiNote: null,
          });
          apply(result, [0], 0);
        } else if (step.kind === "error") {
          setState({ status: "error", message: step.message });
        }
        if (step.kind === "queue") void askQueue(t, ctrl, step.urgent, Boolean(result));
      } catch (e) {
        if ((e as Error).name === "AbortError" || ctrl.signal.aborted) return;
        setState({ status: "error", message: (e as Error).message });
      } finally {
        if (inflight.current === t) inflight.current = null;
      }
    },
    [aiAvailable, apply, askQueue, auto, context, getTerm, language, showAi],
  );

  // Chinese words can be a single character; English needs 2 letters.
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
    // A typing pause is not urgent: the AI part waits to join a batch.
    const timer = setTimeout(() => void suggestRef.current(t, false), 900);
    return () => clearTimeout(timer);
  }, [auto, minLength, term]);

  /** Leaving the word field suggests at once instead of waiting for the pause. */
  const suggestIfNew = useCallback(() => {
    const t = getTerm().trim();
    if (auto && t.length >= minLength && t !== lastTerm.current) void suggest(t);
  }, [auto, getTerm, minLength, suggest]);

  /** "Dùng AI ngay": ask the AI now for the word whose dictionary answer is shown. */
  const aiNow = useCallback(() => {
    if (state.status !== "done" || state.source !== "dict" || !aiAvailable) return;
    const t = lastTerm.current;
    const ctrl = abort.current && !abort.current.signal.aborted ? abort.current : new AbortController();
    abort.current = ctrl;
    setState({ ...state, aiPending: true, aiNote: null });
    void askQueue(t, ctrl, true, true);
  }, [aiAvailable, askQueue, state]);

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
    // Also drops this card's word from the AI queue if it has not been sent yet.
    abort.current?.abort();
    inflight.current = null;
    lastTerm.current = "";
    setState({ status: "idle" });
    setContext("");
  };

  // While the queue waits out a "busy" answer, say so under the dictionary result.
  const shown: State =
    state.status === "done" && state.aiPending && busySeconds && !state.aiNote
      ? { ...state, aiNote: `AI đang bận, sẽ tự bổ sung sau ${busySeconds} giây.` }
      : state;

  return { state: shown, suggest, suggestIfNew, toggle, chooseAll, context, setContext, reset, aiAvailable, aiNow };
}

export function AiSuggestButton({ loading, onClick }: { loading: boolean; onClick: () => void }) {
  return (
    <Button type="button" onClick={onClick} disabled={loading} className="h-14 px-5 lg:h-14">
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
            <SenseChips
              senses={state.result.senses}
              chosen={state.chosen}
              onToggle={toggle}
              onChooseAll={chooseAll}
            />
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
          {state.source === "dict" && ai.aiAvailable && !state.aiPending && (
            <button
              type="button"
              onClick={ai.aiNow}
              className="inline-flex min-h-10 items-center gap-1.5 rounded-md bg-primary-soft px-3 text-sm font-medium text-primary-fg hover:bg-primary-soft/80"
            >
              <Sparkles className="size-4" aria-hidden />
              Dùng AI ngay
            </button>
          )}
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
