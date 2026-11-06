/**
 * The answer of /api/clone for an account that has no access to "Tâm sự" (never switched on, or switched off by an
 * admin in the middle of a chat). Shared by the route and the browser; no server-only imports.
 */

/** The text shown to the person; the box is locked with it. */
export const CLONE_FORBIDDEN_MESSAGE = "Tính năng này hiện chưa mở cho bạn.";

/** The `kind` the route puts in the JSON body next to the 404, so the browser can tell this 404 from any other. */
export const CLONE_FORBIDDEN_KIND = "forbidden";

/**
 * Pure. True when a chat request failed with the "no access" answer. The AI SDK puts the response body in the
 * error's message, so this reads the JSON `kind`; anything else (a network error, another 404) is not it.
 */
export function isCloneForbidden(error: Error | undefined | null): boolean {
  if (!error?.message) return false;
  try {
    const body = JSON.parse(error.message) as { kind?: unknown };
    return body?.kind === CLONE_FORBIDDEN_KIND;
  } catch {
    return false;
  }
}
