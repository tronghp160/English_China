"use client";

import { CheckCircle2, Download, MonitorDown, Share } from "lucide-react";
import { useState, useSyncExternalStore } from "react";
import { Button } from "@/components/ui/button";
import {
  desktopBrowser,
  getInstallState,
  isDesktop,
  promptInstall,
  SERVER_INSTALL_STATE,
  subscribeInstall,
  type DesktopBrowser,
  type InstallState,
} from "@/lib/pwa";

const noop = () => () => {};

/** Where to click when the browser gives no install prompt (already dismissed, or not Chromium). */
function DesktopSteps({ browser }: { browser: DesktopBrowser }) {
  const list = "mt-2 list-decimal space-y-1 pl-5 text-fg";
  if (browser === "edge")
    return (
      <ol className={list}>
        <li>Bấm menu ⋯ ở góc trên bên phải của Edge.</li>
        <li>Chọn “Ứng dụng” → “Cài đặt trang web này dưới dạng ứng dụng”.</li>
        <li>Khi Edge hỏi, đánh dấu “Tạo lối tắt trên màn hình nền” (và “Ghim vào thanh tác vụ” nếu muốn).</li>
      </ol>
    );
  if (browser === "chrome")
    return (
      <ol className={list}>
        <li>Bấm biểu tượng cài đặt (hình màn hình có mũi tên) ở cuối thanh địa chỉ, hoặc menu ⋮ → “Truyền, lưu và chia sẻ” → “Cài đặt trang dưới dạng ứng dụng…”.</li>
        <li>Bấm “Cài đặt”. Sổ Từ mở trong cửa sổ riêng và có trong menu Start (Windows) hoặc Launchpad (Mac).</li>
        <li>Muốn mở nhanh hơn: khi Sổ Từ đang mở, chuột phải vào biểu tượng của nó trên thanh tác vụ (Windows) hoặc Dock (Mac) → “Ghim” / “Giữ trong Dock”.</li>
      </ol>
    );
  if (browser === "safari")
    return (
      <ol className={list}>
        <li>Trên thanh menu của Safari, chọn “Tệp” → “Thêm vào Dock”.</li>
        <li>Bấm “Thêm”. Sổ Từ có biểu tượng trong Dock và mở như ứng dụng (cần macOS Sonoma trở lên).</li>
      </ol>
    );
  return (
    <p className="mt-2 text-fg">
      Trình duyệt này chưa cài được ứng dụng web. Mở Sổ Từ bằng Google Chrome hoặc Microsoft Edge rồi bấm lại nút ở trên.
    </p>
  );
}

/** Computers: one button. It opens the browser's own install dialog when there is one, else shows where to click. */
function DesktopInstall({ state }: { state: InstallState }) {
  const [steps, setSteps] = useState(false);
  const [browser] = useState(desktopBrowser);

  const install = async () => {
    if (state.kind === "prompt") {
      await promptInstall();
      return;
    }
    setSteps(true);
  };

  return (
    <div className="text-sm text-fg-muted">
      <p>Cài Sổ Từ thành ứng dụng trên máy tính: có biểu tượng ngoài màn hình desktop và thanh tác vụ, mở trong cửa sổ riêng như một phần mềm.</p>
      <Button type="button" onClick={() => void install()} className="mt-3">
        <MonitorDown aria-hidden />
        Cài Sổ Từ lên máy tính
      </Button>
      {steps && (
        <div className="mt-3 rounded-md bg-surface-2 p-3" role="status">
          <p className="font-medium text-fg">Trình duyệt chưa tự mở hộp cài đặt. Làm theo các bước sau:</p>
          <DesktopSteps browser={browser} />
        </div>
      )}
    </div>
  );
}

/** "Cài lên màn hình chính": native prompt where the browser offers one, steps otherwise. */
export function InstallApp() {
  const state = useSyncExternalStore(subscribeInstall, getInstallState, () => SERVER_INSTALL_STATE);
  // Read once on the client (false on the server, so the first render matches).
  const desktop = useSyncExternalStore(noop, isDesktop, () => false);

  if (state.kind === "installed") {
    return (
      <p className="flex items-center gap-2 text-sm text-fg">
        <CheckCircle2 className="size-5 text-success-fg" aria-hidden />
        Sổ Từ đã được cài trên máy này.
      </p>
    );
  }

  if (desktop) return <DesktopInstall state={state} />;

  // Phones and tablets: unchanged.
  if (state.kind === "prompt") {
    return (
      <div>
        <p className="text-sm text-fg-muted">Mở nhanh từ màn hình chính, toàn màn hình như ứng dụng.</p>
        <button
          type="button"
          onClick={() => void promptInstall()}
          className="mt-3 inline-flex min-h-11 items-center gap-2 rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground"
        >
          <Download className="size-4" aria-hidden />
          Cài Sổ Từ lên máy
        </button>
      </div>
    );
  }

  return (
    <div className="text-sm text-fg-muted">
      <p>Thêm Sổ Từ vào màn hình chính để mở nhanh như ứng dụng:</p>
      {state.kind === "ios" ? (
        <ol className="mt-2 list-decimal space-y-1 pl-5 text-fg">
          <li>
            Mở trang này bằng Safari, bấm nút Chia sẻ <Share className="inline size-4 align-text-bottom" aria-label="(biểu tượng Chia sẻ)" />
          </li>
          <li>Chọn “Thêm vào MH chính”.</li>
        </ol>
      ) : (
        <ol className="mt-2 list-decimal space-y-1 pl-5 text-fg">
          <li>Mở menu của trình duyệt (dấu ⋮ hoặc ⋯).</li>
          <li>Chọn “Cài đặt ứng dụng” hoặc “Thêm vào màn hình chính”.</li>
        </ol>
      )}
    </div>
  );
}
