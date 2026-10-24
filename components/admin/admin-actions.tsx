"use client";

import { Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { grantAdmin } from "@/lib/actions/admin";
import type { ActionResult } from "@/lib/actions/result";

/**
 * One admin action as a small button. `run` is a server action already bound to its target. With `confirm` it asks
 * first (everything that deletes or locks), then reports with a toast and refreshes the page.
 */
export function AdminAction({
  label,
  run,
  done,
  confirm,
  destructive = false,
  variant = "outline",
}: {
  label: string;
  run: () => Promise<ActionResult>;
  /** Toast text when it worked */
  done: string;
  confirm?: { title: string; text: string; action: string };
  destructive?: boolean;
  variant?: "outline" | "soft";
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, start] = useTransition();
  const go = () =>
    start(async () => {
      const res = await run();
      if (!res.ok) return void toast.error(res.error);
      toast.success(done);
      setOpen(false);
      router.refresh();
    });

  return (
    <>
      <Button
        type="button"
        size="sm"
        variant={variant}
        tone={variant === "soft" ? (destructive ? "red" : "blue") : undefined}
        disabled={pending}
        onClick={() => (confirm ? setOpen(true) : go())}
        className={destructive && variant === "outline" ? "text-danger-fg hover:bg-danger-soft" : undefined}
      >
        {pending && <Loader2 className="animate-spin" aria-hidden />}
        {label}
      </Button>
      {confirm && (
        <AlertDialog open={open} onOpenChange={setOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>{confirm.title}</AlertDialogTitle>
              <AlertDialogDescription>{confirm.text}</AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Thôi</AlertDialogCancel>
              <AlertDialogAction
                className={destructive ? "bg-danger text-white hover:bg-danger/90" : undefined}
                disabled={pending}
                onClick={(e) => {
                  e.preventDefault();
                  go();
                }}
              >
                {confirm.action}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}
    </>
  );
}

/** "Cấp quyền quản trị" by email: the person needs an account already. */
export function GrantAdminForm() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        start(async () => {
          const res = await grantAdmin({ email });
          if (!res.ok) return void setError(res.fieldErrors?.email ?? res.error);
          setError(null);
          setEmail("");
          toast.success("Đã cấp quyền quản trị.");
          router.refresh();
        });
      }}
      className="flex flex-col gap-2 sm:flex-row sm:items-start"
    >
      <div className="flex-1">
        <label htmlFor="grant-email" className="sr-only">
          Email của người được cấp quyền
        </label>
        <Input
          id="grant-email"
          type="email"
          required
          autoComplete="off"
          placeholder="email@vidu.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          aria-invalid={Boolean(error)}
          aria-describedby={error ? "grant-error" : undefined}
        />
        {error && (
          <p id="grant-error" className="mt-1.5 text-sm text-danger-fg">
            {error}
          </p>
        )}
      </div>
      <Button type="submit" disabled={pending}>
        {pending && <Loader2 className="animate-spin" aria-hidden />}
        Cấp quyền
      </Button>
    </form>
  );
}
