"use client";

import { useEffect, useRef, useState } from "react";
import { flushSync, useFormStatus } from "react-dom";
import { startChat } from "@/lib/actions/chat";
import type { ChatStarter } from "@/lib/ai/tutor/starters";
import { ChatComposer } from "./chat-composer";
import { ChatStarters } from "./chat-starters";
import { TutorHero } from "./tutor-hero";

function Box({
  value,
  setValue,
  inputRef,
}: {
  value: string;
  setValue: (v: string) => void;
  inputRef: React.RefObject<HTMLTextAreaElement | null>;
}) {
  const { pending } = useFormStatus();
  return (
    <ChatComposer
      ref={inputRef}
      name="prompt"
      value={value}
      onChange={setValue}
      onSend={() => inputRef.current?.form?.requestSubmit()}
      busy={pending}
      placeholder="Hỏi về một từ, nhờ sửa câu, luyện hội thoại…"
      className="text-fg"
    />
  );
}

/** The tutor home: hero with free chat input + vibrant starters below. */
export function ChatStart({
  starters,
  tutorName = "Bin",
  mascot = true,
}: {
  starters: ChatStarter[];
  tutorName?: string;
  mascot?: boolean;
}) {
  const [value, setValue] = useState("");
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const formRef = useRef<HTMLFormElement>(null);

  // Focus textarea when page is loaded with #hoi hash
  useEffect(() => {
    if (typeof window !== "undefined" && window.location.hash === "#hoi") {
      inputRef.current?.focus();
    }
  }, []);

  const pick = (s: ChatStarter) => {
    // Put the text into the textarea before the form reads it.
    flushSync(() => setValue(s.text));
    if (s.send) {
      formRef.current?.requestSubmit();
      return;
    }
    requestAnimationFrame(() => {
      const el = inputRef.current;
      el?.focus();
      el?.setSelectionRange(s.text.length, s.text.length);
    });
  };

  return (
    <div className="space-y-6">
      <form id="hoi" ref={formRef} action={startChat}>
        <TutorHero tutorName={tutorName} mascot={mascot}>
          <Box value={value} setValue={setValue} inputRef={inputRef} />
        </TutorHero>
      </form>

      <section aria-labelledby="starters-heading" className="space-y-3">
        <h2 id="starters-heading" className="text-sm font-semibold uppercase tracking-wider text-fg-muted">
          Thử hỏi
        </h2>
        <ChatStarters starters={starters} onPick={pick} />
      </section>
    </div>
  );
}
