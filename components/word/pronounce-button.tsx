"use client";

import { Volume2, VolumeX } from "lucide-react";
import { useEffect, useState } from "react";
import { useOptionalMe } from "@/components/app-shell/me-provider";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { VOICE_HELP, detectPlatform, hasVoiceFor, loadVoices, speak, ttsSupported, type TtsLang } from "@/lib/tts";

/** Speaker button. Disabled with a how-to tooltip when the device lacks a voice for the language. */
export function PronounceButton({
  text,
  lang,
  label,
  size = "md",
  className,
}: {
  text: string;
  lang: TtsLang;
  label?: string;
  size?: "sm" | "md" | "lg";
  className?: string;
}) {
  const me = useOptionalMe();
  const [available, setAvailable] = useState<boolean | null>(null);
  const [speaking, setSpeaking] = useState(false);

  useEffect(() => {
    let alive = true;
    // loadVoices() resolves immediately (empty) when speech synthesis is unsupported.
    loadVoices().then(() => alive && setAvailable(ttsSupported() && hasVoiceFor(lang)));
    return () => {
      alive = false;
    };
  }, [lang]);

  const dims = size === "sm" ? "size-9" : size === "lg" ? "size-12" : "size-11";
  const icon = size === "lg" ? "size-6" : size === "sm" ? "size-4" : "size-5";
  const aria = label ?? `Đọc “${text}”`;

  if (available === false) {
    const help = lang === "zh" ? VOICE_HELP[detectPlatform()] : "Máy chưa có giọng đọc cho ngôn ngữ này.";
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <span
            tabIndex={0}
            role="button"
            aria-disabled="true"
            aria-label={`${aria} — chưa có giọng đọc`}
            className={cn("inline-grid shrink-0 place-items-center rounded-full text-ink-soft opacity-50", dims, className)}
          >
            <VolumeX className={icon} aria-hidden />
          </span>
        </TooltipTrigger>
        <TooltipContent className="max-w-72 text-sm">
          {lang === "zh" ? "Máy chưa có giọng tiếng Trung. " : ""}
          {help}
        </TooltipContent>
      </Tooltip>
    );
  }

  return (
    <button
      type="button"
      aria-label={aria}
      onClick={(e) => {
        e.stopPropagation();
        const voice = lang === "en" ? me?.prefs.voice_en : me?.prefs.voice_zh;
        setSpeaking(true);
        const started = speak(text, lang, {
          voiceName: voice,
          rate: me?.prefs.tts_rate,
          onEnd: () => setSpeaking(false),
        });
        if (!started) setSpeaking(false);
      }}
      className={cn(
        "inline-grid shrink-0 place-items-center rounded-full text-ink-violet transition-colors hover:bg-tint-violet",
        speaking && "bg-tint-violet",
        dims,
        className,
      )}
    >
      <Volume2 className={icon} strokeWidth={1.75} aria-hidden />
    </button>
  );
}
