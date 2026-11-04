import { ExternalLink, MapPin } from "lucide-react";
import { formatCoordinates, formatLocation, isLocalIp, mapLinks } from "@/lib/presence";

export function PlaceLine({
  city,
  region,
  country,
  ip,
  latitude,
  longitude,
  showMap = false,
  compact = false,
  className = "",
}: {
  city?: string | null;
  region?: string | null;
  country?: string | null;
  ip?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  showMap?: boolean;
  compact?: boolean;
  className?: string;
}) {
  const hasLocation = Boolean(
    (city && city.trim().length > 0) ||
      (region && region.trim().length > 0) ||
      (country && country.trim().length > 0),
  );
  const isLocal = Boolean(ip && isLocalIp(ip));

  let locationText: string;
  if (hasLocation) {
    locationText = formatLocation({ city, region, country, withFlag: true });
  } else if (isLocal) {
    locationText = "💻 Mạng nội bộ (Localhost)";
  } else {
    locationText = "Chưa ghi nhận vị trí";
  }

  const queryForMap = hasLocation
    ? formatLocation({ city, region, country, withFlag: false })
    : null;
  const links = showMap ? mapLinks(latitude, longitude, queryForMap) : null;
  const coords = formatCoordinates(latitude, longitude, 4);

  if (compact) {
    return (
      <span className={`inline-flex items-center gap-1.5 ${className}`}>
        <span className="font-medium text-fg">{locationText}</span>
        {ip && <span className="font-mono text-[11px] text-fg-muted">({ip})</span>}
        {links && (
          <a
            href={links.google}
            target="_blank"
            rel="noopener noreferrer"
            title="Mở trên Google Maps"
            className="inline-flex items-center text-primary hover:text-primary-hover hover:underline"
          >
            <MapPin className="size-3" aria-hidden="true" />
            <span className="sr-only">Xem bản đồ</span>
          </a>
        )}
      </span>
    );
  }

  return (
    <div className={`space-y-1.5 ${className}`}>
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-sm font-medium text-fg">{locationText}</span>
        {ip && (
          <span className="rounded bg-surface-2 px-1.5 py-0.5 font-mono text-xs text-fg-muted">
            {ip}
          </span>
        )}
      </div>

      {links && (
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <a
            href={links.google}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-primary hover:underline hover:text-primary-hover"
          >
            Google Maps
            <ExternalLink className="size-3" aria-hidden="true" />
          </a>
          <span className="text-fg-subtle">·</span>
          <a
            href={links.osm}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-primary hover:underline hover:text-primary-hover"
          >
            OpenStreetMap
            <ExternalLink className="size-3" aria-hidden="true" />
          </a>
          {coords && (
            <>
              <span className="text-fg-subtle">·</span>
              <span className="font-mono text-xs text-fg-muted" title="Tọa độ GPS xấp xỉ">
                {coords}
              </span>
            </>
          )}
        </div>
      )}

      {showMap && !isLocal && hasLocation && (
        <p className="text-[11px] text-fg-muted">
          Vị trí ước tính theo dải IP mạng (thường chính xác ở cấp thành phố / tỉnh).
        </p>
      )}
    </div>
  );
}
