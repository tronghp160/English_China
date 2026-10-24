"use client";

import { useOptimistic, useTransition } from "react";
import { toast } from "sonner";
import { SwitchRow } from "@/components/settings/study-prefs";
import { setMemberEdit } from "@/lib/actions/decks";

type Deck = { id: string; name: string; word_count: number; allow_member_edit: boolean };

/** Group owner: per deck, let members add and edit words. */
export function MemberEditToggles({ decks }: { decks: Deck[] }) {
  const [optimistic, setOptimistic] = useOptimistic(
    decks,
    (state, change: { id: string; allowed: boolean }) =>
      state.map((d) => (d.id === change.id ? { ...d, allow_member_edit: change.allowed } : d)),
  );
  const [, start] = useTransition();

  return (
    <div className="divide-y divide-border">
      {optimistic.map((d) => (
        <SwitchRow
          key={d.id}
          id={`member-edit-${d.id}`}
          label={d.name}
          hint={d.allow_member_edit ? "Thành viên được thêm/sửa từ" : "Chỉ bạn sửa được"}
          checked={d.allow_member_edit}
          onCheckedChange={(allowed) =>
            start(async () => {
              setOptimistic({ id: d.id, allowed });
              const res = await setMemberEdit(d.id, allowed);
              if (!res.ok) toast.error(res.error);
            })
          }
        />
      ))}
    </div>
  );
}
