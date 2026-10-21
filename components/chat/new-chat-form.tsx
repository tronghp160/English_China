"use client";

import { MessageCirclePlus } from "lucide-react";
import { useState } from "react";
import { useFormStatus } from "react-dom";
import { LangFlag } from "@/components/lang-flag";
import { Label } from "@/components/ui/label";
import { startChat } from "@/lib/actions/chat";
import { LANGUAGES } from "@/lib/lang/registry";
import type { LangCode } from "@/lib/lang/types";
import { cn } from "@/lib/utils";

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="btn-3d inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-btn bg-primary px-5 font-bold text-primary-foreground [--edge-color:var(--ink-blue-shade)] disabled:opacity-60 sm:w-auto"
    >
      <MessageCirclePlus className="size-5" aria-hidden />
      {pending ? "Đang mở…" : "Bắt đầu trò chuyện"}
    </button>
  );
}

export function NewChatForm({
  langs,
  decks,
}: {
  langs: LangCode[];
  decks: { id: string; name: string; language: LangCode }[];
}) {
  const [language, setLanguage] = useState<LangCode>(langs[0] ?? "en");
  const options = decks.filter((d) => d.language === language);

  return (
    <form action={startChat} className="notebook-card space-y-4 p-4">
      <input type="hidden" name="language" value={language} />
      {langs.length > 1 && (
        <fieldset>
          <legend className="mb-1.5 text-sm font-semibold text-ink">Học ngôn ngữ</legend>
          <div className="flex gap-2">
            {langs.map((l) => (
              <button
                key={l}
                type="button"
                aria-pressed={language === l}
                onClick={() => setLanguage(l)}
                className={cn(
                  "inline-flex min-h-11 items-center gap-2 rounded-btn border px-3 text-sm font-semibold",
                  language === l ? "border-primary bg-wash-blue text-ink" : "border-rule bg-surface text-ink-soft",
                )}
              >
                <LangFlag lang={l} />
                {LANGUAGES[l].label}
              </button>
            ))}
          </div>
        </fieldset>
      )}
      {options.length > 0 && (
        <div className="space-y-1.5">
          <Label htmlFor="chat-deck">Gắn với bộ từ (không bắt buộc)</Label>
          <select
            key={language}
            id="chat-deck"
            name="deck_id"
            defaultValue=""
            className="h-11 w-full rounded-btn border border-rule bg-surface px-3 text-base"
          >
            <option value="">Tất cả bộ từ {LANGUAGES[language].label.toLowerCase()}</option>
            {options.map((d) => (
              <option key={d.id} value={d.id}>
                {d.name}
              </option>
            ))}
          </select>
        </div>
      )}
      <SubmitButton />
    </form>
  );
}
