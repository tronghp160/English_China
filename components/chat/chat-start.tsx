"use client";

import { useRef, useState } from "react";
import { flushSync, useFormStatus } from "react-dom";
import { startChat } from "@/lib/actions/chat";
import type { ChatStarter } from "@/lib/ai/tutor/starters";
import { ChatComposer } from "./chat-composer";
import { ChatStarters } from "./chat-starters";

function Box({ value, setValue, inputRef }: { value: string; setValue: (v: string) => void; inputRef: React.RefObject<HTMLTextAreaElement | null> }) {
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
    />
  );
}

/** The tutor home: one box. Asking opens a new conversation with the question already sent. */
export function ChatStart({ starters }: { starters: ChatStarter[] }) {
  const [value, setValue] = useState("");
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const formRef = useRef<HTMLFormElement>(null);

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
    <form ref={formRef} action={startChat} className="space-y-4">
      <Box value={value} setValue={setValue} inputRef={inputRef} />
      <ChatStarters starters={starters} onPick={pick} />
    </form>
  );
}
