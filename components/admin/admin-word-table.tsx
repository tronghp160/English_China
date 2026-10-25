import { ChevronDown, Globe, Lock, Sparkles, UsersRound } from "lucide-react";
import Link from "next/link";
import { AdminAction } from "@/components/admin/admin-actions";
import { StatusDot } from "@/components/deck/status-dot";
import { LangMark } from "@/components/lang-mark";
import { Button } from "@/components/ui/button";
import { ImageCredit } from "@/components/word/image-picker";
import { deleteWordAsAdmin } from "@/lib/actions/admin";
import type { AdminWordRow } from "@/lib/data/admin";
import { WORDS_PER_PAGE } from "@/lib/data/admin";

const dateFmt = (iso: string | null) =>
  iso
    ? new Intl.DateTimeFormat("vi-VN", { timeZone: "Asia/Ho_Chi_Minh", dateStyle: "short" }).format(
        new Date(iso),
      )
    : "chưa";

export function AdminWordTable({
  rows,
  total,
  page,
  baseHref,
  showCreator = false,
  showStatus = false,
  showDeck = true,
}: {
  rows: AdminWordRow[];
  total: number;
  page: number;
  baseHref: string;
  showCreator?: boolean;
  showStatus?: boolean;
  showDeck?: boolean;
}) {
  const pages = Math.max(1, Math.ceil(total / WORDS_PER_PAGE));
  const pageLink = (p: number) => {
    const sep = baseHref.includes("?") ? "&" : "?";
    return `${baseHref}${sep}page=${p}`;
  };

  if (rows.length === 0) {
    return (
      <div className="rounded-lg bg-surface p-6 text-center text-fg-muted shadow-sm dark:border dark:border-border">
        Không tìm thấy từ vựng nào phù hợp.
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <p className="text-sm text-fg-muted tabular-nums">
        Tổng cộng {total} từ vựng
      </p>

      <ul className="flex flex-col gap-2.5">
        {rows.map((row) => (
          <li key={row.id}>
            <details className="group rounded-lg bg-surface shadow-sm dark:border dark:border-border overflow-hidden">
              <summary className="flex cursor-pointer list-none flex-col gap-2.5 p-4 sm:flex-row sm:items-center sm:justify-between transition-colors hover:bg-surface-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <LangMark lang={row.language} />
                    <span className="font-display text-base font-bold text-fg">
                      {row.term}
                    </span>
                    {row.reading && (
                      <span className="text-sm text-fg-muted">
                        /{row.reading}/
                      </span>
                    )}
                    {row.ai_generated && (
                      <span
                        title="Tạo bởi AI"
                        className="inline-flex items-center gap-1 rounded bg-grape-soft px-1.5 py-0.5 text-xs font-medium text-grape-fg"
                      >
                        <Sparkles className="size-3" aria-hidden />
                        AI
                      </span>
                    )}
                  </div>
                  <p className="mt-1 line-clamp-1 text-sm text-fg">
                    {row.meaning_vi}
                  </p>
                </div>

                <div className="flex shrink-0 flex-wrap items-center gap-3 text-sm text-fg-muted">
                  {showDeck && row.deck && (
                    <Link
                      href={`/admin/decks/${row.deck.id}`}
                      className="inline-flex items-center gap-1 font-medium text-fg hover:underline"
                    >
                      {row.deck.visibility === "public" ? (
                        <Globe className="size-3.5 text-teal-fg" aria-hidden />
                      ) : row.deck.visibility === "group" ? (
                        <UsersRound className="size-3.5 text-orange-fg" aria-hidden />
                      ) : (
                        <Lock className="size-3.5 text-fg-subtle" aria-hidden />
                      )}
                      <span className="max-w-[140px] truncate">{row.deck.name}</span>
                    </Link>
                  )}

                  {showStatus && row.card && (
                    <div className="inline-flex items-center gap-1.5">
                      <StatusDot
                        state={row.card.state}
                        lapses={row.card.lapses}
                        suspended={row.card.suspended}
                        withLabel
                      />
                      {row.card.lapses > 0 && (
                        <span className="text-xs text-danger-fg tabular-nums">
                          ({row.card.lapses} lần quên)
                        </span>
                      )}
                    </div>
                  )}

                  {showCreator && row.created_by && (
                    <Link
                      href={`/admin/users/${row.created_by}`}
                      className="max-w-[120px] truncate text-fg-muted hover:underline"
                    >
                      {row.creatorName || "Người dùng"}
                    </Link>
                  )}

                  <span className="text-xs text-fg-subtle">
                    {dateFmt(row.created_at)}
                  </span>

                  <ChevronDown className="size-4 text-fg-muted transition-transform group-open:rotate-180" />
                </div>
              </summary>

              <div className="border-t border-border bg-surface-2/40 p-4 sm:p-5 flex flex-col gap-4 text-sm">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-3">
                    {row.meaning_en && (
                      <div>
                        <span className="font-semibold text-fg-muted text-xs uppercase tracking-wider">
                          Nghĩa tiếng Anh:
                        </span>
                        <p className="mt-0.5 text-fg">{row.meaning_en}</p>
                      </div>
                    )}

                    {row.parts_of_speech && row.parts_of_speech.length > 0 && (
                      <div>
                        <span className="font-semibold text-fg-muted text-xs uppercase tracking-wider">
                          Từ loại:
                        </span>
                        <p className="mt-0.5 text-fg">{row.parts_of_speech.join(", ")}</p>
                      </div>
                    )}

                    {row.topic && (
                      <div>
                        <span className="font-semibold text-fg-muted text-xs uppercase tracking-wider">
                          Chủ đề:
                        </span>
                        <p className="mt-0.5 text-fg">{row.topic}</p>
                      </div>
                    )}

                    {row.lang_extra && Object.keys(row.lang_extra).length > 0 && (
                      <div>
                        <span className="font-semibold text-fg-muted text-xs uppercase tracking-wider">
                          Thông tin thêm:
                        </span>
                        <div className="mt-1 flex flex-wrap gap-2 text-xs">
                          {Boolean(row.lang_extra.hanviet) && (
                            <span className="rounded bg-surface-3 px-2 py-1">
                              Hán Việt: {String(row.lang_extra.hanviet)}
                            </span>
                          )}
                          {Boolean(row.lang_extra.cefr) && (
                            <span className="rounded bg-surface-3 px-2 py-1">
                              CEFR: {String(row.lang_extra.cefr)}
                            </span>
                          )}
                          {Boolean((row.lang_extra.hsk as { level?: string } | undefined)?.level) && (
                            <span className="rounded bg-surface-3 px-2 py-1">
                              HSK: {String((row.lang_extra.hsk as { level?: string }).level)}
                            </span>
                          )}
                          {Array.isArray(row.lang_extra.measure_words) &&
                            row.lang_extra.measure_words.length > 0 && (
                              <span className="rounded bg-surface-3 px-2 py-1">
                                Lượng từ: {row.lang_extra.measure_words.join(", ")}
                              </span>
                            )}
                        </div>
                      </div>
                    )}

                    {row.personal_note && (
                      <div className="rounded-md bg-streak-soft/40 p-3 text-streak-fg">
                        <span className="font-semibold text-xs uppercase tracking-wider block mb-0.5">
                          Ghi chú riêng:
                        </span>
                        <p className="text-sm whitespace-pre-wrap">{row.personal_note}</p>
                      </div>
                    )}
                  </div>

                  <div className="space-y-3">
                    {row.image_url && (
                      <div className="flex items-start gap-3 rounded-lg bg-surface p-3 border border-border">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={row.image_url}
                          alt={row.term}
                          className="size-20 rounded-md object-cover border border-border shrink-0"
                        />
                        <div className="min-w-0 flex-1">
                          <span className="font-semibold text-xs text-fg-muted uppercase tracking-wider block mb-1">
                            Ảnh minh họa
                          </span>
                          <ImageCredit source={row.image_source} />
                        </div>
                      </div>
                    )}

                    {row.examples && row.examples.length > 0 && (
                      <div>
                        <span className="font-semibold text-fg-muted text-xs uppercase tracking-wider">
                          Ví dụ ({row.examples.length}):
                        </span>
                        <ul className="mt-1 space-y-2">
                          {row.examples.map((ex, i) => (
                            <li key={i} className="rounded bg-surface p-2.5 border border-border text-xs">
                              <p className="font-medium text-fg">{ex.text}</p>
                              {ex.reading && <p className="text-fg-muted mt-0.5">{ex.reading}</p>}
                              {ex.vi && <p className="text-fg-subtle mt-0.5">{ex.vi}</p>}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {row.collocations && row.collocations.length > 0 && (
                      <div>
                        <span className="font-semibold text-fg-muted text-xs uppercase tracking-wider">
                          Cụm từ ({row.collocations.length}):
                        </span>
                        <ul className="mt-1 flex flex-wrap gap-1.5">
                          {row.collocations.map((c, i) => (
                            <li key={i} className="rounded bg-surface px-2 py-1 text-xs border border-border">
                              <span className="font-medium text-fg">{c.text}</span>
                              {c.vi && <span className="text-fg-muted ml-1">({c.vi})</span>}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {((row.synonyms && row.synonyms.length > 0) || (row.antonyms && row.antonyms.length > 0)) && (
                      <div className="flex flex-wrap gap-4 text-xs">
                        {row.synonyms && row.synonyms.length > 0 && (
                          <div>
                            <span className="font-semibold text-fg-muted uppercase">Đồng nghĩa: </span>
                            <span className="text-fg">{row.synonyms.join(", ")}</span>
                          </div>
                        )}
                        {row.antonyms && row.antonyms.length > 0 && (
                          <div>
                            <span className="font-semibold text-fg-muted uppercase">Trái nghĩa: </span>
                            <span className="text-fg">{row.antonyms.join(", ")}</span>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex justify-end pt-2 border-t border-border">
                  <AdminAction
                    label="Xóa từ"
                    destructive
                    run={deleteWordAsAdmin.bind(null, { wordId: row.id })}
                    done="Đã xóa từ."
                    confirm={{
                      title: `Xóa từ "${row.term}"?`,
                      text: "Từ này sẽ bị xóa khỏi bộ từ và không thể hoàn tác.",
                      action: "Xóa từ",
                    }}
                  />
                </div>
              </div>
            </details>
          </li>
        ))}
      </ul>

      {pages > 1 && (
        <nav aria-label="Trang từ vựng" className="mt-4 flex items-center justify-between gap-3">
          {page > 1 ? (
            <Button asChild variant="outline">
              <Link href={pageLink(page - 1)}>Trang trước</Link>
            </Button>
          ) : (
            <span />
          )}
          <span className="text-sm text-fg-muted tabular-nums">
            Trang {page}/{pages}
          </span>
          {page < pages ? (
            <Button asChild variant="outline">
              <Link href={pageLink(page + 1)}>Trang sau</Link>
            </Button>
          ) : (
            <span />
          )}
        </nav>
      )}
    </div>
  );
}
