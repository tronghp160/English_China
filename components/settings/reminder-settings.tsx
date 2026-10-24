"use client";

import { BellRing } from "lucide-react";
import { useEffect, useState, useTransition } from "react";
import { toast } from "sonner";
import { Switch } from "@/components/ui/switch";
import { removePushSubscription, savePushSubscription, sendTestReminder } from "@/lib/actions/push";

type State = "loading" | "unsupported" | "ios-install" | "no-worker" | "denied" | "off" | "on";

function urlBase64ToUint8Array(base64: string) {
  const padded = (base64 + "=".repeat((4 - (base64.length % 4)) % 4)).replace(/-/g, "+").replace(/_/g, "/");
  return Uint8Array.from(atob(padded), (c) => c.charCodeAt(0));
}

const isIos = () => /iphone|ipad|ipod/i.test(navigator.userAgent);
const isStandalone = () =>
  window.matchMedia("(display-mode: standalone)").matches || (navigator as { standalone?: boolean }).standalone === true;

async function currentState(): Promise<{ state: State; sub: PushSubscription | null }> {
  if (!("serviceWorker" in navigator) || !("PushManager" in window) || !("Notification" in window)) {
    // iOS only exposes Web Push to apps added to the home screen (16.4+).
    return { state: isIos() && !isStandalone() ? "ios-install" : "unsupported", sub: null };
  }
  const reg = await navigator.serviceWorker.getRegistration();
  if (!reg) return { state: "no-worker", sub: null };
  if (Notification.permission === "denied") return { state: "denied", sub: null };
  const sub = await reg.pushManager.getSubscription();
  return { state: sub ? "on" : "off", sub };
}

/** "Nhắc ôn hằng ngày": subscribes this device to the 19:00 reminder (lib/push.ts). */
export function ReminderSettings({ publicKey }: { publicKey: string | null }) {
  const [state, setState] = useState<State>("loading");
  const [pending, start] = useTransition();

  useEffect(() => {
    if (!publicKey) return;
    currentState()
      .then(({ state }) => setState(state))
      .catch(() => setState("unsupported"));
  }, [publicKey]);

  if (!publicKey) {
    return <p className="text-sm text-fg-muted">Máy chủ chưa bật thông báo nhắc ôn.</p>;
  }

  const enable = () =>
    start(async () => {
      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        setState(permission === "denied" ? "denied" : "off");
        if (permission === "default") toast("Cần cho phép thông báo để bật nhắc ôn.");
        return;
      }
      try {
        const reg = await navigator.serviceWorker.ready;
        const sub =
          (await reg.pushManager.getSubscription()) ??
          (await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: urlBase64ToUint8Array(publicKey) }));
        const res = await savePushSubscription(sub.toJSON());
        if (!res.ok) {
          await sub.unsubscribe();
          return void toast.error(res.error);
        }
        setState("on");
        toast.success("Đã bật nhắc ôn trên máy này");
      } catch (e) {
        console.error(e);
        toast.error("Trình duyệt không cho đăng ký thông báo. Thử lại sau.");
      }
    });

  const disable = () =>
    start(async () => {
      const { sub } = await currentState();
      if (sub) {
        await removePushSubscription(sub.endpoint);
        await sub.unsubscribe();
      }
      setState("off");
      toast.success("Đã tắt nhắc ôn trên máy này");
    });

  const test = () =>
    start(async () => {
      const res = await sendTestReminder();
      if (!res.ok) return void toast.error(res.error);
      toast.success("Đã gửi thông báo thử");
    });

  return (
    <div className="space-y-3">
      <div className="flex items-start justify-between gap-4">
        <div>
          <label htmlFor="reminder-switch" className="font-medium text-fg">
            Nhắc ôn hằng ngày
          </label>
          <p className="text-sm text-fg-muted">Thông báo lúc 19:00 khi còn từ cần ôn. Chỉ áp dụng cho máy này.</p>
        </div>
        <Switch
          id="reminder-switch"
          checked={state === "on"}
          disabled={pending || !(state === "on" || state === "off")}
          onCheckedChange={(c) => (c ? enable() : disable())}
        />
      </div>
      {state === "on" && (
        <button
          type="button"
          onClick={test}
          disabled={pending}
          className="inline-flex min-h-11 items-center gap-2 rounded-md border border-border bg-surface px-4 text-sm font-medium hover:bg-muted disabled:opacity-60"
        >
          <BellRing className="size-4" aria-hidden />
          Gửi thử
        </button>
      )}
      {state === "denied" && (
        <p className="rounded-md bg-streak-soft px-3 py-2 text-sm text-fg">
          Bạn đã chặn thông báo của Sổ Từ. Mở biểu tượng ổ khóa cạnh địa chỉ trang → Thông báo → Cho phép, rồi tải lại trang.
        </p>
      )}
      {state === "ios-install" && (
        <p className="rounded-md bg-primary-soft px-3 py-2 text-sm text-fg">
          Trên iPhone, hãy cài Sổ Từ lên màn hình chính (mục “Ứng dụng” bên dưới), mở từ biểu tượng đó rồi bật nhắc ôn.
        </p>
      )}
      {state === "unsupported" && <p className="text-sm text-fg-muted">Trình duyệt này không hỗ trợ thông báo.</p>}
      {state === "no-worker" && (
        <p className="text-sm text-fg-muted">Thông báo cần bản đã cài đặt của Sổ Từ. Tải lại trang rồi thử lại.</p>
      )}
    </div>
  );
}
