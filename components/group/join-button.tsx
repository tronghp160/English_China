"use client";

import { Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { joinGroup } from "@/lib/actions/groups";

export function JoinButton({ code }: { code: string }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  return (
    <Button
      type="button"
      size="lg"
      disabled={pending}
      className="w-full sm:w-auto sm:px-8"
      onClick={() =>
        start(async () => {
          const res = await joinGroup(code);
          if (!res.ok) return void toast.error(res.error);
          toast.success("Đã vào nhóm");
          router.replace(`/groups/${res.data.groupId}`);
        })
      }
    >
      {pending && <Loader2 className="animate-spin" aria-hidden />}
      Vào nhóm
    </Button>
  );
}
