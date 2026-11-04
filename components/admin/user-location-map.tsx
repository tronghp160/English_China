"use client";

import { Check, Copy, ExternalLink, Globe, MapPin, Navigation, Clock, Laptop } from "lucide-react";
import { useState } from "react";
import { formatCoordinates, formatLocation, isLocalIp, mapLinks } from "@/lib/presence";

export function UserLocationMap({
  city,
  region,
  country,
  ip,
  latitude,
  longitude,
  timezone,
  className = "",
}: {
  city?: string | null;
  region?: string | null;
  country?: string | null;
  ip?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  timezone?: string | null;
  className?: string;
}) {
  const [copiedCoords, setCopiedCoords] = useState(false);
  const [copiedIp, setCopiedIp] = useState(false);
  const [zoomDelta, setZoomDelta] = useState(0.006); // ~ 500m radius (street level)

  const hasLocation = Boolean(
    (city && city.trim().length > 0) ||
      (region && region.trim().length > 0) ||
      (country && country.trim().length > 0),
  );
  const isLocal = Boolean(ip && isLocalIp(ip));

  const hasCoords =
    latitude != null &&
    longitude != null &&
    Number.isFinite(latitude) &&
    Number.isFinite(longitude) &&
    latitude >= -90 &&
    latitude <= 90 &&
    longitude >= -180 &&
    longitude <= 180;

  const locationText = hasLocation
    ? formatLocation({ city, region, country, withFlag: true })
    : isLocal
      ? "💻 Mạng nội bộ (Localhost)"
      : "Chưa ghi nhận vị trí";

  const rawLocation = hasLocation
    ? formatLocation({ city, region, country, withFlag: false })
    : null;

  const links = mapLinks(latitude, longitude, rawLocation);
  const coordsFormatted = formatCoordinates(latitude, longitude, 5);

  const handleCopyCoords = async () => {
    if (!coordsFormatted) return;
    try {
      await navigator.clipboard.writeText(coordsFormatted);
      setCopiedCoords(true);
      setTimeout(() => setCopiedCoords(false), 2000);
    } catch {
      // fallback
    }
  };

  const handleCopyIp = async () => {
    if (!ip) return;
    try {
      await navigator.clipboard.writeText(ip);
      setCopiedIp(true);
      setTimeout(() => setCopiedIp(false), 2000);
    } catch {
      // fallback
    }
  };

  const minLon = (longitude ?? 0) - zoomDelta;
  const maxLon = (longitude ?? 0) + zoomDelta;
  const minLat = (latitude ?? 0) - zoomDelta * 0.7;
  const maxLat = (latitude ?? 0) + zoomDelta * 0.7;

  const embedUrl = hasCoords
    ? `https://www.openstreetmap.org/export/embed.html?bbox=${minLon.toFixed(5)}%2C${minLat.toFixed(5)}%2C${maxLon.toFixed(5)}%2C${maxLat.toFixed(5)}&layer=mapnik&marker=${latitude?.toFixed(5)}%2C${longitude?.toFixed(5)}`
    : null;

  return (
    <div className={`space-y-4 rounded-xl border border-border bg-surface p-4 shadow-sm sm:p-5 ${className}`}>
      {/* Location header */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <MapPin className="size-5 text-primary shrink-0" aria-hidden="true" />
            <h3 className="text-base font-bold text-fg">{locationText}</h3>
          </div>
          <p className="text-xs text-fg-muted">
            {hasCoords
              ? "Tọa độ GPS định vị chính xác · Bấm Google Maps để mở thẳng đến vị trí số nhà / tuyến đường"
              : isLocal
                ? "Kết nối nội bộ trong máy chủ hoặc mạng LAN"
                : "Chưa có dữ liệu tọa độ chi tiết"}
          </p>
        </div>

        {links && (
          <div className="flex flex-wrap items-center gap-2">
            <a
              href={links.google}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 rounded-md border border-border bg-surface-2 px-2.5 py-1 text-xs font-medium text-fg hover:bg-surface-3 hover:text-primary transition-colors"
            >
              Google Maps
              <ExternalLink className="size-3" aria-hidden="true" />
            </a>
            <a
              href={links.osm}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 rounded-md border border-border bg-surface-2 px-2.5 py-1 text-xs font-medium text-fg hover:bg-surface-3 hover:text-primary transition-colors"
            >
              OpenStreetMap
              <ExternalLink className="size-3" aria-hidden="true" />
            </a>
          </div>
        )}
      </div>

      {/* Interactive Map Embed */}
      {hasCoords && embedUrl ? (
        <div className="relative overflow-hidden rounded-lg border border-border bg-surface-2 shadow-inner">
          <div className="relative h-64 sm:h-72 w-full">
            <iframe
              title={`Bản đồ vị trí: ${locationText}`}
              src={embedUrl}
              className="h-full w-full border-0 pointer-events-auto"
              loading="lazy"
            />
          </div>

          {/* Map Overlay Controls */}
          <div className="absolute top-2 right-2 flex flex-col gap-1 z-10">
            <button
              type="button"
              onClick={() => setZoomDelta((z) => Math.max(0.008, z * 0.5))}
              title="Phóng to bản đồ"
              className="flex size-7 items-center justify-center rounded bg-surface/90 text-sm font-bold text-fg shadow backdrop-blur hover:bg-surface"
            >
              +
            </button>
            <button
              type="button"
              onClick={() => setZoomDelta((z) => Math.min(0.2, z * 2))}
              title="Thu nhỏ bản đồ"
              className="flex size-7 items-center justify-center rounded bg-surface/90 text-sm font-bold text-fg shadow backdrop-blur hover:bg-surface"
            >
              −
            </button>
          </div>

          <div className="absolute bottom-2 left-2 flex items-center gap-2 rounded bg-surface/90 px-2 py-1 text-[11px] font-mono text-fg shadow backdrop-blur">
            <Navigation className="size-3 text-primary animate-pulse" />
            <span>{coordsFormatted}</span>
          </div>
        </div>
      ) : isLocal ? (
        <div className="flex items-center gap-3 rounded-lg border border-border bg-surface-2 p-4 text-sm text-fg-muted">
          <Laptop className="size-8 text-fg-muted shrink-0" aria-hidden="true" />
          <div>
            <p className="font-medium text-fg">Thiết bị đang chạy mạng cục bộ (Localhost)</p>
            <p className="text-xs">
              Địa chỉ IP là dải loopback/nội bộ ({ip || "127.0.0.1"}). Vị trí thực tế sẽ được hiển thị khi người dùng truy cập qua mạng công cộng.
            </p>
          </div>
        </div>
      ) : null}

      {/* Detailed Meta Grid */}
      <div className="grid gap-3 sm:grid-cols-3">
        {/* IP Address */}
        <div className="rounded-lg border border-border bg-surface-2/60 p-3">
          <div className="flex items-center justify-between">
            <span className="flex items-center gap-1.5 text-xs text-fg-muted">
              <Globe className="size-3.5" aria-hidden="true" />
              Địa chỉ IP
            </span>
            {ip && (
              <button
                type="button"
                onClick={handleCopyIp}
                className="inline-flex items-center gap-1 text-[11px] text-primary hover:underline"
              >
                {copiedIp ? (
                  <>
                    <Check className="size-3 text-c-mint" />
                    <span>Đã chép</span>
                  </>
                ) : (
                  <>
                    <Copy className="size-3" />
                    <span>Sao chép</span>
                  </>
                )}
              </button>
            )}
          </div>
          <p className="mt-1 font-mono text-sm font-bold text-fg">
            {ip || "Chưa ghi nhận"}
          </p>
        </div>

        {/* GPS Coordinates */}
        <div className="rounded-lg border border-border bg-surface-2/60 p-3">
          <div className="flex items-center justify-between">
            <span className="flex items-center gap-1.5 text-xs text-fg-muted">
              <Navigation className="size-3.5" aria-hidden="true" />
              Tọa độ GPS
            </span>
            {coordsFormatted && (
              <button
                type="button"
                onClick={handleCopyCoords}
                className="inline-flex items-center gap-1 text-[11px] text-primary hover:underline"
              >
                {copiedCoords ? (
                  <>
                    <Check className="size-3 text-c-mint" />
                    <span>Đã chép</span>
                  </>
                ) : (
                  <>
                    <Copy className="size-3" />
                    <span>Sao chép</span>
                  </>
                )}
              </button>
            )}
          </div>
          <p className="mt-1 font-mono text-sm font-bold text-fg">
            {coordsFormatted || "Chưa có tọa độ"}
          </p>
        </div>

        {/* Timezone */}
        <div className="rounded-lg border border-border bg-surface-2/60 p-3">
          <span className="flex items-center gap-1.5 text-xs text-fg-muted">
            <Clock className="size-3.5" aria-hidden="true" />
            Múi giờ
          </span>
          <p className="mt-1 text-sm font-bold text-fg">
            {timezone
              ? `${timezone}${timezone === "Asia/Ho_Chi_Minh" ? " (UTC+7)" : ""}`
              : "Chưa rõ"}
          </p>
        </div>
      </div>
    </div>
  );
}
