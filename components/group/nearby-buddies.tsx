"use client";

import { useState } from "react";
import { Compass, MapPin, RefreshCw, Search, Users, AlertCircle, Sparkles } from "lucide-react";
import { UserAvatar } from "@/components/app-shell/user-menu";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatDistanceKm } from "@/lib/geo";
import type { NearbyBuddy } from "@/app/api/nearby/route";
import { ago } from "@/lib/admin-format";

const RADIUS_OPTIONS = [
  { value: 5, label: "5 km" },
  { value: 10, label: "10 km" },
  { value: 20, label: "20 km" },
  { value: 50, label: "50 km" },
];

export function NearbyBuddies() {
  const [radiusKm, setRadiusKm] = useState(10);
  const [loading, setLoading] = useState(false);
  const [buddies, setBuddies] = useState<NearbyBuddy[] | null>(null);
  const [permissionDenied, setPermissionDenied] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [userCoords, setUserCoords] = useState<{ lat: number; lng: number } | null>(null);

  const scanNearby = (overrideRadius?: number) => {
    const selectedRadius = overrideRadius ?? radiusKm;
    if (overrideRadius) {
      setRadiusKm(overrideRadius);
    }

    if (!("geolocation" in navigator)) {
      setErrorMessage("Trình duyệt của bạn không hỗ trợ định vị GPS.");
      return;
    }

    setLoading(true);
    setErrorMessage(null);
    setPermissionDenied(false);

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        setUserCoords({ lat, lng });

        let city: string | undefined;
        let region: string | undefined;

        // Try reverse geocoding to determine ward/city
        try {
          const geoRes = await fetch(
            `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${lat}&longitude=${lng}&localityLanguage=vi`,
            { signal: AbortSignal.timeout(3000) }
          );
          if (geoRes.ok) {
            const data = await geoRes.json();
            city = data.locality || data.city;
            region = data.principalSubdivision;
          }
        } catch {
          // ignore reverse geocode timeout
        }

        try {
          const res = await fetch("/api/nearby", {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({
              latitude: lat,
              longitude: lng,
              radiusKm: selectedRadius,
              city,
              region,
            }),
          });

          if (!res.ok) {
            throw new Error("Không thể tải danh sách bạn học.");
          }

          const data = await res.json();
          setBuddies(data.buddies ?? []);
        } catch (err: unknown) {
          const msg = err instanceof Error ? err.message : "Đã có lỗi xảy ra.";
          setErrorMessage(msg);
        } finally {
          setLoading(false);
        }
      },
      (err) => {
        setLoading(false);
        if (err.code === err.PERMISSION_DENIED) {
          setPermissionDenied(true);
        } else {
          setErrorMessage("Không thể kết nối vệ tinh GPS hoặc tín hiệu yếu.");
        }
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 60000,
      }
    );
  };

  return (
    <section className="rounded-xl border border-border/80 bg-surface p-5 shadow-sm">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-c-mint/15 text-c-mint">
            <Compass className="size-5" aria-hidden="true" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-fg">Bạn học quanh đây</h2>
            <p className="mt-0.5 text-xs text-fg-muted sm:text-sm">
              Tìm các bạn học tiếng Anh & tiếng Trung trong bán kính 10–20km quanh bạn để cùng tạo nhóm và thi đua.
            </p>
          </div>
        </div>

        {/* Radius pills */}
        <div className="flex flex-wrap items-center gap-1.5 rounded-lg border border-border bg-surface-2 p-1">
          {RADIUS_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => {
                setRadiusKm(opt.value);
                if (buddies !== null) {
                  scanNearby(opt.value);
                }
              }}
              className={`rounded-md px-2.5 py-1 text-xs font-semibold transition-colors ${
                radiusKm === opt.value
                  ? "bg-primary text-primary-fg shadow-sm"
                  : "text-fg-muted hover:text-fg"
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* Main trigger button when not scanned yet */}
      {buddies === null && !loading && !permissionDenied && (
        <div className="mt-4 rounded-lg border border-dashed border-border bg-surface-2/40 p-4 text-center">
          <p className="text-xs text-fg-muted">
            Khi bấm tìm kiếm, trình duyệt sẽ xin quyền vị trí để đo khoảng cách thực tế giữa bạn và các bạn học khác.
          </p>
          <Button
            type="button"
            onClick={() => scanNearby()}
            className="mt-3 gap-2"
          >
            <Search className="size-4" aria-hidden="true" />
            Quét tìm bạn học trong bán kính {radiusKm} km
          </Button>
        </div>
      )}

      {/* Loading state */}
      {loading && (
        <div className="mt-5 flex flex-col items-center justify-center py-6 text-center">
          <RefreshCw className="size-6 text-primary animate-spin" />
          <p className="mt-2 text-sm font-medium text-fg">
            Đang đo khoảng cách vệ tinh và tìm bạn học quanh {radiusKm} km...
          </p>
          <p className="text-xs text-fg-muted">Đang tính toán theo bán kính địa lý</p>
        </div>
      )}

      {/* Permission denied message */}
      {permissionDenied && (
        <div className="mt-4 flex items-start gap-3 rounded-lg border border-c-orange/30 bg-c-orange/10 p-4 text-sm">
          <AlertCircle className="size-5 shrink-0 text-c-orange" aria-hidden="true" />
          <div>
            <p className="font-semibold text-fg">Trình duyệt chưa được cấp quyền vị trí</p>
            <p className="mt-1 text-xs text-fg-muted">
              Để dùng tính năng tìm bạn học quanh 10–20km, bạn hãy bấm vào biểu tượng ổ khóa/vị trí trên thanh địa chỉ trình duyệt và chọn &apos;Cho phép&apos; (Allow), sau đó thử lại.
            </p>
            <Button
              size="sm"
              variant="outline"
              onClick={() => scanNearby()}
              className="mt-3"
            >
              Thử lại
            </Button>
          </div>
        </div>
      )}

      {/* Error message */}
      {errorMessage && (
        <div className="mt-4 rounded-lg bg-surface-2 p-3 text-xs text-c-red">
          {errorMessage}
        </div>
      )}

      {/* Buddy list results */}
      {buddies !== null && !loading && (
        <div className="mt-4 space-y-3">
          <div className="flex items-center justify-between text-xs text-fg-muted">
            <span>
              Tìm thấy <strong className="text-fg">{buddies.length}</strong> bạn học trong vòng {radiusKm} km
            </span>
            <button
              type="button"
              onClick={() => scanNearby()}
              className="inline-flex items-center gap-1 text-primary hover:underline font-medium"
            >
              <RefreshCw className="size-3" />
              Quét lại
            </button>
          </div>

          {buddies.length === 0 ? (
            <div className="rounded-lg border border-border bg-surface-2/40 p-6 text-center">
              <Users className="mx-auto size-8 text-fg-muted" aria-hidden="true" />
              <p className="mt-2 text-sm font-medium text-fg">
                Chưa thấy bạn học nào trong bán kính {radiusKm} km quanh bạn.
              </p>
              <p className="mt-1 text-xs text-fg-muted">
                Hãy thử mở rộng bán kính tìm kiếm lên {radiusKm < 20 ? "20 km" : "50 km"} để kết nối với nhiều bạn học hơn!
              </p>
              <div className="mt-3 flex justify-center gap-2">
                {radiusKm < 20 && (
                  <Button size="sm" variant="secondary" onClick={() => scanNearby(20)}>
                    Mở rộng 20 km
                  </Button>
                )}
                {radiusKm < 50 && (
                  <Button size="sm" variant="secondary" onClick={() => scanNearby(50)}>
                    Mở rộng 50 km
                  </Button>
                )}
              </div>
            </div>
          ) : (
            <div className="grid gap-2.5 sm:grid-cols-2">
              {buddies.map((b) => (
                <div
                  key={b.userId}
                  className="flex items-center justify-between gap-3 rounded-lg border border-border bg-surface-2 p-3 transition-colors hover:border-primary/40"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <UserAvatar
                      name={b.displayName}
                      url={b.avatarUrl}
                      seed={b.username || b.userId}
                      className="size-10 shrink-0"
                    />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5">
                        <span className="font-semibold text-sm truncate text-fg">
                          {b.displayName}
                        </span>
                        {b.username && (
                          <span className="text-xs text-fg-muted truncate">
                            @{b.username}
                          </span>
                        )}
                      </div>
                      <div className="mt-0.5 flex flex-wrap items-center gap-2 text-xs">
                        <span className="inline-flex items-center gap-1 font-medium text-primary">
                          <MapPin className="size-3" />
                          {formatDistanceKm(b.distanceKm)}
                        </span>
                        {b.city && (
                          <span className="text-fg-subtle truncate">
                            · {b.city}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex shrink-0 items-center gap-2">
                    {b.level > 1 && (
                      <Badge variant="soft" tone="sun">
                        <Sparkles className="size-3 mr-0.5" />
                        Cấp {b.level}
                      </Badge>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </section>
  );
}
