"use client";

import { Download, Loader2 } from "lucide-react";
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
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { deleteAccount } from "@/lib/actions/account";

const LINK_BTN =
  "inline-flex min-h-11 items-center gap-2 rounded-md border border-border bg-surface px-4 text-sm font-medium text-fg hover:bg-muted";

export function ExportData() {
  return (
    <div>
      <p className="text-sm text-fg-muted">
        Tải về toàn bộ bộ từ, tiến độ ôn và thống kê để tự lưu trữ. File CSV mở được bằng Excel hoặc Google Sheets.
      </p>
      <div className="mt-3 flex flex-wrap gap-2">
        <a href="/api/export?format=csv" download className={LINK_BTN}>
          <Download className="size-4 text-fg-muted" aria-hidden />
          Từ vựng (CSV)
        </a>
        <a href="/api/export?format=json" download className={LINK_BTN}>
          <Download className="size-4 text-fg-muted" aria-hidden />
          Toàn bộ dữ liệu (JSON)
        </a>
      </div>
    </div>
  );
}

export function DeleteAccount({ username }: { username: string }) {
  const router = useRouter();
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const matches = confirm.trim().replace(/^@/, "").toLowerCase() === username.toLowerCase();

  return (
    <div>
      <p className="text-sm text-fg-muted">
        Xóa vĩnh viễn tài khoản cùng mọi bộ từ, ảnh, tiến độ ôn và nhóm bạn làm chủ. Không khôi phục được.
      </p>
      <AlertDialog
        onOpenChange={() => {
          setConfirm("");
          setError(null);
        }}
      >
        <AlertDialogTrigger className="mt-3 min-h-11 rounded-md bg-danger-soft px-4 text-sm font-medium text-danger-fg">
          Xóa tài khoản
        </AlertDialogTrigger>
        <AlertDialogContent className="rounded-xl">
          <AlertDialogHeader>
            <AlertDialogTitle>Xóa tài khoản vĩnh viễn?</AlertDialogTitle>
            <AlertDialogDescription>
              Mọi bộ từ bạn tạo (kể cả bộ từ đưa vào nhóm), ảnh tải lên, tiến độ ôn, thống kê và các nhóm bạn làm chủ sẽ
              bị xóa. Từ bạn thêm vào bộ từ của người khác vẫn được giữ. Nên xuất dữ liệu trước khi xóa.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div>
            <label htmlFor="delete-confirm" className="text-sm text-fg">
              Gõ <span className="font-medium">{username}</span> để xác nhận
            </label>
            <Input
              id="delete-confirm"
              value={confirm}
              onChange={(e) => {
                setConfirm(e.target.value);
                setError(null);
              }}
              autoComplete="off"
              autoCapitalize="none"
              spellCheck={false}
              aria-invalid={Boolean(error) || undefined}
              aria-describedby={error ? "delete-confirm-error" : undefined}
              className="mt-1.5 h-11 rounded-md text-base"
            />
            {error && (
              <p id="delete-confirm-error" className="mt-1.5 text-sm text-danger-fg">
                {error}
              </p>
            )}
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={pending} className="min-h-11 rounded-md">
              Giữ tài khoản
            </AlertDialogCancel>
            <AlertDialogAction
              disabled={!matches || pending}
              className="min-h-11 gap-2 rounded-md bg-danger text-white hover:bg-danger/90"
              onClick={(e) => {
                e.preventDefault(); // keep the dialog open until the server answers
                start(async () => {
                  const res = await deleteAccount({ confirm });
                  if (!res.ok) return setError(res.fieldErrors?.confirm ?? res.error);
                  toast.success("Đã xóa tài khoản. Tạm biệt!");
                  router.replace("/");
                  router.refresh();
                });
              }}
            >
              {pending && <Loader2 className="size-4 animate-spin" aria-hidden />}
              Xóa vĩnh viễn
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
