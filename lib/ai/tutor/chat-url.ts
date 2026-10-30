/**
 * Address of a tutor conversation. Every conversation lives on the /chat route (`?c=<id>`), so opening,
 * starting or reloading one never switches to another page component: the chat that is streaming stays
 * mounted. `/chat/<id>` links from before still work (that page redirects here). Pure.
 */
export function chatUrl(threadId?: string | null, prompt?: string): string {
  const params = new URLSearchParams();
  if (threadId) params.set("c", threadId);
  if (prompt) params.set("q", prompt);
  const qs = params.toString();
  return qs ? `/chat?${qs}` : "/chat";
}
