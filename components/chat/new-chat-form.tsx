"use client";

import { MessageCirclePlus } from "lucide-react";
import { useState } from "react";
import { useFormStatus } from "react-dom";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { startChat } from "@/lib/actions/chat";
import { LANGUAGES } from "@/lib/lang/registry";
import type { LangCode } from "@/lib/lang/types";
import { cn } from "@/lib/utils";

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" size="lg" disabled={pending} className="w-full sm:w-auto">
      <MessageCirclePlus aria-hidden />
      {pending ? "Đang mở…" : "Bắt đầu trò chuyện"}
    </Button>
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
    <form action={startChat} className="space-y-4">
      <input type="hidden" name="language" value={language} />
      {langs.length > 1 && (
        <fieldset>
          <legend className="mb-1.5 text-sm font-medium text-fg">Học ngôn ngữ</legend>
          <div className="inline-flex gap-0.5 rounded-full bg-surface-2 p-1">
            {langs.map((l) => (
              <button
                key={l}
                type="button"
                aria-pressed={language === l}
                onClick={() => setLanguage(l)}
                className={cn(
                  "inline-flex h-9 items-center rounded-full px-3.5 text-sm font-medium transition-colors",
                  language === l ? "bg-surface text-fg shadow-sm" : "text-fg-muted hover:text-fg",
                )}
              >
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
            className="h-11 w-full rounded-md border border-input bg-surface px-3 text-base outline-none focus-visible:border-primary focus-visible:ring-3 focus-visible:ring-primary-soft"
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
