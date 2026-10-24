"use client";

import { CheckCircle2, Download, Share } from "lucide-react";
import { useSyncExternalStore } from "react";
import { getInstallState, promptInstall, SERVER_INSTALL_STATE, subscribeInstall } from "@/lib/pwa";

/** "Cài lên màn hình chính": native prompt where the browser offers one, steps otherwise. */
export function InstallApp() {
  const state = useSyncExternalStore(subscribeInstall, getInstallState, () => SERVER_INSTALL_STATE);

  if (state.kind === "installed") {
    return (
      <p className="flex items-center gap-2 text-sm text-fg">
        <CheckCircle2 className="size-5 text-success-fg" aria-hidden />
        Sổ Từ đã được cài trên máy này.
      </p>
    );
  }

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
