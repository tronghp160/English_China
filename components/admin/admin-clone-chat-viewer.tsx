"use client";

import { HeartHandshake, MessageCircle, Trash2, User } from "lucide-react";
import Link from "next/link";
import { useState, useTransition } from "react";
import { MessageText } from "@/components/chat/message-text";
import { Button } from "@/components/ui/button";
import { deleteCloneThreadAsAdmin } from "@/lib/actions/admin";
import type { AdminCloneMessage, AdminCloneThread } from "@/lib/data/admin";
import { cn } from "@/lib/utils";

const dateFmt = (iso: string | null) =>
  iso
    ? new Intl.DateTimeFormat("vi-VN", {
        timeZone: "Asia/Ho_Chi_Minh",
        dateStyle: "short",
        timeStyle: "short",
      }).format(new Date(iso))
    : "chưa";

export function AdminCloneChatViewer({
  threads,
  activeThreadId,
  messages,
  userId,
  cloneName,
}: {
  threads: AdminCloneThread[];
  activeThreadId?: string;
  messages?: AdminCloneMessage[];
  userId: string;
  cloneName: string;
}) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  if (threads.length === 0) {
    return (
      <div className="rounded-lg bg-surface p-8 text-center text-fg-muted shadow-sm dark:border dark:border-border">
        <HeartHandshake className="mx-auto size-10 text-fg-subtle mb-3" />
        <p className="font-semibold text-fg">Chưa có phiên trò chuyện nào</p>
        <p className="mt-1 text-sm text-fg-muted">
          Người dùng này chưa trò chuyện với bản AI ({cloneName}).
        </p>
      </div>
    );
  }

  const activeThread = threads.find((t) => t.id === activeThreadId) || (activeThreadId ? null : threads[0]);

  const handleDelete = () => {
    if (!activeThread) return;
    if (!window.confirm("Bạn có chắc chắn muốn xóa toàn bộ phiên trò chuyện này không?")) return;
    setError(null);
    startTransition(async () => {
      const res = await deleteCloneThreadAsAdmin({ threadId: activeThread.id, userId });
      if (!res.ok) {
        setError(res.error || "Không thể xóa phiên trò chuyện.");
      }
    });
  };

  return (
    <div className="grid gap-5 lg:grid-cols-[320px_1fr]">
      {/* Threads list */}
      <div className="flex flex-col gap-2 rounded-lg bg-surface p-3 shadow-sm dark:border dark:border-border max-h-[650px] overflow-y-auto">
        <div className="flex items-center justify-between px-2 py-1">
          <h3 className="text-xs font-bold uppercase tracking-wider text-fg-muted">
            Phiên tâm sự ({threads.length})
          </h3>
          <span className="text-xs text-fg-subtle">
            {threads.reduce((n, t) => n + t.messageCount, 0)} tin nhắn
          </span>
        </div>
        <ul className="flex flex-col gap-1.5">
          {threads.map((t) => {
            const isActive = activeThread?.id === t.id;
            return (
              <li key={t.id}>
                <Link
                  href={`/admin/users/${userId}?tab=tamsu&thread=${t.id}`}
                  className={cn(
                    "flex flex-col gap-1 rounded-md p-2.5 transition-colors text-left",
                    isActive
                      ? "bg-primary/10 text-primary font-medium"
                      : "hover:bg-surface-2 text-fg",
                  )}
                >
                  <div className="flex items-center gap-1.5">
                    <HeartHandshake className="size-4 shrink-0 text-primary" aria-hidden />
                    <span className="truncate text-sm font-semibold">{t.title}</span>
                  </div>
                  {t.firstMessage && t.firstMessage !== t.title && (
                    <p className="line-clamp-2 text-xs text-fg-muted font-normal">
                      {t.firstMessage}
                    </p>
                  )}
                  <div className="flex items-center justify-between text-xs text-fg-subtle mt-0.5">
                    <span>{t.messageCount} tin nhắn</span>
                    <span>{dateFmt(t.lastMessageAt || t.updatedAt)}</span>
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
      </div>

      {/* Messages view */}
      <div className="flex flex-col rounded-lg bg-surface p-4 sm:p-5 shadow-sm dark:border dark:border-border min-h-[420px]">
        {activeThread ? (
          <>
            <div className="flex items-center justify-between border-b border-border pb-3 mb-4">
              <div className="min-w-0 pr-3">
                <div className="flex items-center gap-2">
                  <HeartHandshake className="size-5 shrink-0 text-primary" />
                  <h3 className="font-bold text-base truncate">{activeThread.title}</h3>
                </div>
                <p className="text-xs text-fg-muted mt-0.5">
                  Bắt đầu: {dateFmt(activeThread.createdAt)} · Cập nhật: {dateFmt(activeThread.lastMessageAt || activeThread.updatedAt)}
                </p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleDelete}
                  disabled={pending}
                  className="text-danger hover:text-danger hover:bg-danger/10 border-danger/30"
                  aria-label="Xóa phiên trò chuyện này"
                >
                  <Trash2 className="size-4 mr-1" />
                  <span className="hidden sm:inline">Xóa phiên</span>
                </Button>
              </div>
            </div>

            {error && (
              <div className="mb-4 rounded-md bg-danger/10 p-3 text-xs text-danger font-medium">
                {error}
              </div>
            )}

            {messages && messages.length > 0 ? (
              <div className="flex flex-col gap-4 overflow-y-auto max-h-[550px] pr-2">
                {messages.map((m) => {
                  const isUser = m.role === "user";
                  return (
                    <div
                      key={m.id}
                      className={cn(
                        "flex gap-3 text-sm",
                        isUser ? "flex-row-reverse" : "flex-row",
                      )}
                    >
                      <div
                        className={cn(
                          "size-8 shrink-0 rounded-full flex items-center justify-center text-xs shadow-xs",
                          isUser
                            ? "bg-primary text-white"
                            : "bg-surface-3 text-primary border border-border font-bold",
                        )}
                        aria-hidden
                        title={isUser ? "Người dùng" : cloneName}
                      >
                        {isUser ? <User className="size-4" /> : <HeartHandshake className="size-4" />}
                      </div>

                      <div
                        className={cn(
                          "flex max-w-[85%] flex-col gap-1.5 rounded-2xl p-3.5 shadow-xs",
                          isUser
                            ? "bg-primary text-white rounded-tr-xs"
                            : "bg-surface-2 text-fg border border-border rounded-tl-xs",
                        )}
                      >
                        <div className="flex items-center justify-between gap-3 text-xs mb-0.5 font-medium opacity-80">
                          <span>{isUser ? "Người dùng" : `${cloneName} (bản AI)`}</span>
                        </div>
                        <div
                          className={cn(
                            "leading-relaxed",
                            isUser && "[&_p]:text-white [&_a]:text-white [&_strong]:text-white",
                          )}
                        >
                          <MessageText text={m.content} />
                        </div>
                        <span
                          className={cn(
                            "text-[10px] self-end mt-1 tabular-nums",
                            isUser ? "text-white/75" : "text-fg-subtle",
                          )}
                        >
                          {dateFmt(m.createdAt)}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="flex flex-1 items-center justify-center text-fg-muted">
                {activeThreadId ? "Chưa có tin nhắn trong cuộc trò chuyện này." : "Đang tải tin nhắn..."}
              </div>
            )}
          </>
        ) : (
          <div className="flex flex-1 items-center justify-center text-fg-muted">
            <MessageCircle className="size-8 text-fg-subtle mr-2" />
            Chọn một cuộc trò chuyện để xem nội dung
          </div>
        )}
      </div>
    </div>
  );
}
