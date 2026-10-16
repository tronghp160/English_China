"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

/** Type an invite code → open /join/[code] (preview + confirm). */
export function JoinCodeForm() {
  const router = useRouter();
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const clean = code.replace(/[\s-]/g, "").toUpperCase();
    if (!/^[A-Z0-9]{8}$/.test(clean)) return setError("Mã mời gồm 8 ký tự, ví dụ K7PQ2MXA.");
    router.push(`/join/${clean}`);
  }

  return (
    <form onSubmit={submit} noValidate>
      <label htmlFor="invite-code" className="text-sm font-medium text-ink">
        Có mã mời?
      </label>
      <div className="mt-1.5 flex gap-2">
        <Input
          id="invite-code"
          value={code}
          onChange={(e) => {
            setCode(e.target.value);
            setError(null);
          }}
          placeholder="Nhập 8 ký tự"
          autoComplete="off"
          autoCapitalize="characters"
          spellCheck={false}
          maxLength={12}
          aria-invalid={Boolean(error) || undefined}
          aria-describedby={error ? "invite-code-error" : undefined}
          className="h-11 min-w-0 flex-1 rounded-[10px] font-mono text-base tracking-widest uppercase placeholder:font-sans placeholder:tracking-normal placeholder:normal-case"
        />
        <Button type="submit" variant="outline" className="h-11 rounded-[10px] px-4">
          Vào nhóm
        </Button>
      </div>
      {error && (
        <p id="invite-code-error" className="mt-1.5 text-sm text-danger">
          {error}
        </p>
      )}
    </form>
  );
}
