/**
 * Per-request stopwatch for the tutor routes. Logs one line per request (`[<label>:timing]`); no PII except ids
 * and never any message text.
 */
export function tutorTimer(label = "tutor") {
  const t0 = performance.now();
  const marks: Record<string, number> = {};
  return {
    mark(name: string) {
      marks[name] = Math.round(performance.now() - t0);
    },
    /** Server-Timing header value, e.g. "auth;dur=120, prelude;dur=480". */
    header(): string {
      return Object.entries(marks)
        .map(([k, v]) => `${k};dur=${v}`)
        .join(", ");
    },
    log(extra: Record<string, unknown>) {
      console.info(`[${label}:timing]`, JSON.stringify({ ...marks, ...extra }));
    },
  };
}
