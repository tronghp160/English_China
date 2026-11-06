"use client";

import { Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Switch } from "@/components/ui/switch";
import { setCloneAccess } from "@/lib/actions/clone-access";

/**
 * "Cho phép dùng Tâm sự với {name}": the admin's switch for one account (table clone_access). The whole row is the
 * target (≥ 44px). Admins always have access, so theirs is shown on and locked. It decides who may use the feature
 * and nothing else: there is no conversation to read, the chat is stored nowhere.
 */
export function CloneAccessSwitch({
  userId,
  name,
  enabled,
  isAdmin,
}: {
  userId: string;
  name: string;
  enabled: boolean;
  isAdmin: boolean;
}) {
  const router = useRouter();
  const [checked, setChecked] = useState(enabled);
  const [pending, start] = useTransition();
  const id = `clone-access-${userId}`;

  const change = (next: boolean) => {
    setChecked(next); // shown at once; put back if the server refuses
    start(async () => {
      const res = await setCloneAccess({ userId, enabled: next });
      if (!res.ok) {
        setChecked(!next);
        return void toast.error(res.error);
      }
      toast.success(next ? "Đã bật Tâm sự cho người này." : "Đã tắt Tâm sự cho người này.");
      router.refresh();
    });
  };

  return (
    <div>
      <label htmlFor={id} className="flex min-h-11 cursor-pointer items-center justify-between gap-4 has-disabled:cursor-default">
        <span className="min-w-0 font-semibold">Cho phép dùng Tâm sự với {name}</span>
        <span className="flex shrink-0 items-center gap-2">
          {pending && <Loader2 className="size-4 animate-spin text-fg-muted" aria-hidden />}
          <Switch id={id} checked={isAdmin || checked} onCheckedChange={change} disabled={isAdmin || pending} />
        </span>
      </label>
      {isAdmin && <p className="text-sm text-fg-muted">Quản trị viên luôn dùng được, không cần bật.</p>}
    </div>
  );
}
