import { Fragment, memo, type ReactNode } from "react";

/*
 * Tiny renderer for the tutor's light markdown: paragraphs, "- " / "1. " lists,
 * **bold**, *italic* and `code`. Everything stays React text (escaped); no HTML.
 */

const HANZI = /([㐀-鿿豈-﫿　-〿＀-￯]+)/;

function hanzi(text: string, key: string): ReactNode {
  return text.split(HANZI).map((chunk, i) =>
    i % 2 ? (
      <span key={`${key}-${i}`} lang="zh" className="font-hanzi-sans">
        {chunk}
      </span>
    ) : (
      <Fragment key={`${key}-${i}`}>{chunk}</Fragment>
    ),
  );
}

const INLINE = /(\*\*[^*]+\*\*|`[^`]+`|\*[^*\s][^*]*\*|_[^_\s][^_]*_)/;

export function inline(text: string, key = "i"): ReactNode {
  return text.split(INLINE).map((tok, i) => {
    const k = `${key}-${i}`;
    if (i % 2 === 0) return <Fragment key={k}>{hanzi(tok, k)}</Fragment>;
    if (tok.startsWith("**")) return <strong key={k} className="font-semibold">{hanzi(tok.slice(2, -2), k)}</strong>;
    if (tok.startsWith("`")) return <code key={k} className="rounded-sm bg-surface-2 px-1 text-[0.9em]">{tok.slice(1, -1)}</code>;
    return <em key={k}>{hanzi(tok.slice(1, -1), k)}</em>;
  });
}

type Block = { kind: "p" | "ul" | "ol"; lines: string[] };

export function toBlocks(text: string): Block[] {
  const blocks: Block[] = [];
  for (const raw of text.replace(/\r/g, "").split("\n")) {
    const line = raw.trimEnd();
    const ul = /^\s*[-*•]\s+(.*)$/.exec(line);
    const ol = /^\s*\d+[.)]\s+(.*)$/.exec(line);
    const kind = ul ? "ul" : ol ? "ol" : "p";
    const content = ul?.[1] ?? ol?.[1] ?? line.replace(/^#{1,6}\s+/, "");
    if (!line.trim()) {
      blocks.push({ kind: "p", lines: [] }); // paragraph break
      continue;
    }
    const last = blocks.at(-1);
    if (last && last.kind === kind && (kind !== "p" || last.lines.length)) last.lines.push(content);
    else blocks.push({ kind, lines: [content] });
  }
  return blocks.filter((b) => b.lines.length);
}

/** Memoized on `text`: a streaming answer re-parses only its own growing text. No hooks, so the admin viewer can render it on the server. */
export const MessageText = memo(function MessageText({ text }: { text: string }) {
  return (
    <div className="space-y-3 leading-relaxed break-words">
      {toBlocks(text).map((b, bi) => {
        if (b.kind === "p")
          return (
            <p key={bi}>
              {b.lines.map((l, li) => (
                <Fragment key={li}>
                  {li > 0 && <br />}
                  {inline(l, `${bi}-${li}`)}
                </Fragment>
              ))}
            </p>
          );
        const List = b.kind === "ul" ? "ul" : "ol";
        return (
          <List key={bi} className={b.kind === "ul" ? "list-disc space-y-1 pl-5 marker:text-fg-muted" : "list-decimal space-y-1 pl-5 marker:text-fg-muted"}>
            {b.lines.map((l, li) => (
              <li key={li}>{inline(l, `${bi}-${li}`)}</li>
            ))}
          </List>
        );
      })}
    </div>
  );
});
