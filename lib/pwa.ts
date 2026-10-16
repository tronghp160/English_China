"use client";

/** Chrome/Edge/Android fire this before showing their own install UI. Not in lib.dom yet. */
export interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

export type InstallState =
  | { kind: "installed" }
  | { kind: "prompt"; event: BeforeInstallPromptEvent }
  | { kind: "ios" }
  | { kind: "manual" };

let deferred: BeforeInstallPromptEvent | null = null;
let installed = false;
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((l) => l());

/** Registers public/sw.js (production only) and captures the install prompt. Call once on the client. */
let started = false;
export function setupPwa() {
  if (typeof window === "undefined" || started) return;
  started = true;
  window.addEventListener("beforeinstallprompt", (e) => {
    e.preventDefault();
    deferred = e as BeforeInstallPromptEvent;
    emit();
  });
  window.addEventListener("appinstalled", () => {
    installed = true;
    deferred = null;
    emit();
  });
  if (process.env.NODE_ENV === "production" && "serviceWorker" in navigator) {
    const register = () =>
      navigator.serviceWorker.register("/sw.js", { scope: "/", updateViaCache: "none" }).catch(() => undefined);
    if (document.readyState === "complete") register();
    else window.addEventListener("load", register, { once: true });
  }
}

export function subscribeInstall(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function isStandalone() {
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    (navigator as Navigator & { standalone?: boolean }).standalone === true
  );
}

function isIos() {
  return /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
}

let snapshot: InstallState = { kind: "manual" };
export function getInstallState(): InstallState {
  const next: InstallState =
    installed || isStandalone()
      ? { kind: "installed" }
      : deferred
        ? { kind: "prompt", event: deferred }
        : isIos()
          ? { kind: "ios" }
          : { kind: "manual" };
  // useSyncExternalStore needs a stable reference while nothing changed.
  if (next.kind !== snapshot.kind || (next.kind === "prompt" && snapshot.kind === "prompt" && next.event !== snapshot.event)) {
    snapshot = next;
  }
  return snapshot;
}

export const SERVER_INSTALL_STATE: InstallState = { kind: "manual" };

export async function promptInstall() {
  const e = deferred;
  if (!e) return false;
  await e.prompt();
  const { outcome } = await e.userChoice;
  deferred = null;
  if (outcome === "accepted") installed = true;
  emit();
  return outcome === "accepted";
}
