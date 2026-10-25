import { Bot, MessageCircle, User } from "lucide-react";
import Link from "next/link";
import { MessageText } from "@/components/chat/message-text";
import { LangMark } from "@/components/lang-mark";
import type { AdminMessage, AdminThread } from "@/lib/data/admin";
import { cn } from "@/lib/utils";

const dateFmt = (iso: string | null) =>
  iso
    ? new Intl.DateTimeFormat("vi-VN", {
        timeZone: "Asia/Ho_Chi_Minh",
        dateStyle: "short",
        timeStyle: "short",
      }).format(new Date(iso))
    : "chưa";

export function AdminChatViewer({
  threads,
  activeThreadId,
  messages,
  userId,
}: {
  threads: AdminThread[];
  activeThreadId?: string;
  messages?: AdminMessage[];
  userId: string;
}) {
  if (threads.length === 0) {
    return (
      <div className="rounded-lg bg-surface p-6 text-center text-fg-muted shadow-sm dark:border dark:border-border">
        Chưa có cuộc trò chuyện nào với gia sư AI.
      </div>
    );
  }

  const activeThread = threads.find((t) => t.id === activeThreadId) || (activeThreadId ? null : threads[0]);

  return (
    <div className="grid gap-5 lg:grid-cols-[300px_1fr]">
      {/* Threads list */}
      <div className="flex flex-col gap-2 rounded-lg bg-surface p-3 shadow-sm dark:border dark:border-border max-h-[650px] overflow-y-auto">
        <h3 className="px-2 py-1 text-xs font-bold uppercase tracking-wider text-fg-muted">
          Cuộc trò chuyện ({threads.length})
        </h3>
        <ul className="flex flex-col gap-1.5">
          {threads.map((t) => {
            const isActive = activeThread?.id === t.id;
            return (
              <li key={t.id}>
                <Link
                  href={`/admin/users/${userId}?tab=chat&thread=${t.id}`}
                  className={cn(
                    "flex flex-col gap-1 rounded-md p-2.5 transition-colors text-left",
                    isActive
                      ? "bg-primary/10 text-primary font-medium"
                      : "hover:bg-surface-2 text-fg",
                  )}
                >
                  <div className="flex items-center gap-1.5">
                    <LangMark lang={t.language} />
                    <span className="truncate text-sm font-semibold">{t.title}</span>
                  </div>
                  {t.deckName && (
                    <span className="truncate text-xs text-fg-muted">
                      Bộ: {t.deckName}
                    </span>
                  )}
                  <div className="flex items-center justify-between text-xs text-fg-subtle mt-0.5">
                    <span>{t.messageCount} tin nhắn</span>
                    <span>{dateFmt(t.updatedAt)}</span>
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
      </div>

      {/* Messages view */}
      <div className="flex flex-col rounded-lg bg-surface p-4 sm:p-5 shadow-sm dark:border dark:border-border min-h-[400px]">
        {activeThread ? (
          <>
            <div className="flex items-center justify-between border-b border-border pb-3 mb-4">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <LangMark lang={activeThread.language} />
                  <h3 className="font-bold text-base truncate">{activeThread.title}</h3>
                </div>
                {activeThread.deckName && (
                  <p className="text-xs text-fg-muted mt-0.5">
                    Gắn với bộ từ: {activeThread.deckName}
                  </p>
                )}
              </div>
              <span className="text-xs text-fg-subtle shrink-0">
                Cập nhật: {dateFmt(activeThread.updatedAt)}
              </span>
            </div>

            {messages && messages.length > 0 ? (
              <div className="flex flex-col gap-4 overflow-y-auto max-h-[550px] pr-2">
                {messages.map((m) => {
                  const isUser = m.role === "user";
                  const parts = Array.isArray(m.parts) ? m.parts : [];

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
                          "size-7 shrink-0 rounded-full flex items-center justify-center text-xs",
                          isUser
                            ? "bg-primary text-white"
                            : "bg-grape-soft text-grape-fg border border-border",
                        )}
                        aria-hidden
                      >
                        {isUser ? <User className="size-4" /> : <Bot className="size-4" />}
                      </div>

                      <div
                        className={cn(
                          "flex max-w-[85%] flex-col gap-1.5 rounded-xl p-3.5",
                          isUser
                            ? "bg-primary text-white"
                            : "bg-surface-2 text-fg border border-border",
                        )}
                      >
                        {(parts as Record<string, unknown>[]).map((p, idx) => {
                          if (p.type === "text" && typeof p.text === "string") {
                            return (
                              <div
                                key={idx}
                                className={cn(
                                  isUser && "[&_p]:text-white [&_a]:text-white [&_strong]:text-white",
                                )}
                              >
                                <MessageText text={p.text} />
                              </div>
                            );
                          }

                          // Render tool calls / suggestions as collapsible JSON
                          const pType = typeof p.type === "string" ? p.type : "tool";
                          const pName = typeof p.toolName === "string" ? p.toolName : typeof p.name === "string" ? p.name : "Dữ liệu công cụ";
                          return (
                            <details
                              key={idx}
                              className="mt-1 rounded bg-surface-3/80 p-2 text-xs border border-border"
                            >
                              <summary className="cursor-pointer font-mono text-fg-muted hover:text-fg">
                                {pType}: {pName}
                              </summary>
                              <pre className="mt-1.5 overflow-x-auto text-[11px] font-mono text-fg p-1.5 bg-surface rounded">
                                {JSON.stringify(p, null, 2)}
                              </pre>
                            </details>
                          );
                        })}

                        <span
                          className={cn(
                            "text-[10px] self-end mt-1",
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
