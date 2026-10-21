"use client";

import { Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { toast } from "sonner";
import { joinGroup } from "@/lib/actions/groups";

export function JoinButton({ code }: { code: string }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  return (
    <button
      type="button"
      disabled={pending}
      onClick={() =>
        start(async () => {
          const res = await joinGroup(code);
          if (!res.ok) return void toast.error(res.error);
          toast.success("Đã vào nhóm");
          router.replace(`/groups/${res.data.groupId}`);
        })
      }
      className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-btn bg-primary px-6 text-base font-medium text-primary-foreground sm:w-auto"
    >
      {pending && <Loader2 className="size-5 animate-spin" aria-hidden />}
      Vào nhóm
    </button>
  );
}
