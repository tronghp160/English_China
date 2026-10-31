/** Per-request stopwatch for the tutor route. Logs one line per request; no PII except ids. */
export function tutorTimer() {
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
      console.info("[tutor:timing]", JSON.stringify({ ...marks, ...extra }));
    },
  };
}
