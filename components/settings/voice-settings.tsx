"use client";

import { Volume2 } from "lucide-react";
import { useEffect, useState, useSyncExternalStore, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { updatePrefs } from "@/lib/actions/profile";
import { cn } from "@/lib/utils";
import {
  VOICE_HELP,
  detectPlatform,
  loadVoices,
  onVoicesChanged,
  speak,
  ttsSupported,
  voicesFor,
  type TtsLang,
} from "@/lib/tts";
import type { Prefs } from "@/lib/validation";

const SAMPLES: Record<TtsLang, string> = { en: "resilient", zh: "坚强" };
const RATES = [
  { value: 0.6, label: "Chậm" },
  { value: 0.85, label: "Vừa" },
  { value: 1, label: "Bình thường" },
] as const;
const AUTO = "__auto__";
const noSubscribe = () => () => {};

export function VoiceSettings({ prefs }: { prefs: Required<Prefs> }) {
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [state, setState] = useState(prefs);
  const [, startTransition] = useTransition();
  // Server and hydration render as supported, then the real value: avoids a hydration mismatch.
  const supported = useSyncExternalStore(noSubscribe, ttsSupported, () => true);

  useEffect(() => {
    let alive = true;
    loadVoices().then((v) => {
      if (!alive) return;
      setVoices(v);
      setLoaded(true);
    });
    const off = onVoicesChanged(() => loadVoices().then(setVoices));
    return () => {
      alive = false;
      off();
    };
  }, []);

  function save(patch: Prefs) {
    setState((s) => ({ ...s, ...patch }));
    startTransition(async () => {
      const res = await updatePrefs(patch);
      if (!res.ok) toast.error(res.error);
    });
  }

  if (!supported) {
    return <p className="text-sm text-ink-soft">Trình duyệt này không hỗ trợ đọc phát âm.</p>;
  }

  return (
    <div className="space-y-6">
      {(["en", "zh"] as const).map((lang) => {
        const list = voicesFor(lang, voices);
        const key = lang === "en" ? "voice_en" : "voice_zh";
        const current = state[key] ?? AUTO;
        return (
          <div key={lang} className="space-y-1.5">
            <Label htmlFor={`voice-${lang}`}>
              Giọng {lang === "en" ? "tiếng Anh" : "tiếng Trung"}
            </Label>
            <div className="flex gap-2">
              <Select
                value={list.some((v) => v.name === current) ? current : AUTO}
                onValueChange={(v) => save({ [key]: v === AUTO ? null : v })}
                disabled={!list.length}
              >
                <SelectTrigger id={`voice-${lang}`} className="h-11 flex-1 rounded-[10px]">
                  <SelectValue placeholder="Tự chọn" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={AUTO}>Tự chọn giọng phù hợp</SelectItem>
                  {list.map((v) => (
                    <SelectItem key={v.voiceURI} value={v.name}>
                      {v.name} ({v.lang})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button
                type="button"
                variant="outline"
                className="size-11 rounded-[10px]"
                aria-label={`Nghe thử giọng ${lang === "en" ? "tiếng Anh" : "tiếng Trung"}`}
                disabled={!list.length}
                onClick={() =>
                  speak(SAMPLES[lang], lang, { voiceName: state[key], rate: state.tts_rate })
                }
              >
                <Volume2 className="size-5" aria-hidden />
              </Button>
            </div>
            {loaded && !list.length && (
              <p className="text-sm text-ink-soft">
                Máy chưa có giọng {lang === "en" ? "tiếng Anh" : "tiếng Trung"}.{" "}
                {lang === "zh" && VOICE_HELP[detectPlatform()]}
              </p>
            )}
          </div>
        );
      })}

      <fieldset>
        <legend className="mb-2 text-sm font-medium">Tốc độ đọc</legend>
        <div role="radiogroup" className="inline-flex rounded-[10px] border border-rule bg-surface p-1">
          {RATES.map((r) => (
            <button
              key={r.value}
              type="button"
              role="radio"
              aria-checked={state.tts_rate === r.value}
              onClick={() => save({ tts_rate: r.value })}
              className={cn(
                "min-h-11 rounded-[8px] px-4 text-sm text-ink-soft",
                state.tts_rate === r.value && "bg-wash-blue font-medium text-ink",
              )}
            >
              {r.label}
            </button>
          ))}
        </div>
      </fieldset>
    </div>
  );
}
