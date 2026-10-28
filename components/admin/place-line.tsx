import { isLocalIp, mapLinks, placeLabel } from "@/lib/presence";

export function PlaceLine({
  city,
  region,
  country,
  ip,
  latitude,
  longitude,
  showMap = false,
  className = "",
}: {
  city?: string | null;
  region?: string | null;
  country?: string | null;
  ip?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  showMap?: boolean;
  className?: string;
}) {
  const isLocal = isLocalIp(ip ?? null);
  const locationText = isLocal ? "Máy local (không có vị trí)" : placeLabel({ city: city ?? null, region: region ?? null, country: country ?? null });
  const links = showMap && latitude != null && longitude != null ? mapLinks(latitude, longitude) : null;

  return (
    <div className={`space-y-1 ${className}`}>
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-sm text-fg">{locationText}</span>
        {ip && <span className="font-mono text-xs text-fg-muted">({ip})</span>}
      </div>
      {links && (
        <div className="flex items-center gap-3">
          <a
            href={links.google}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex min-h-10 items-center gap-1 text-xs text-primary underline hover:text-primary-hover"
          >
            Google Maps
          </a>
          <span className="text-fg-subtle">·</span>
          <a
            href={links.osm}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex min-h-10 items-center gap-1 text-xs text-primary underline hover:text-primary-hover"
          >
            OpenStreetMap
          </a>
        </div>
      )}
      {showMap && !isLocal && (
        <p className="text-xs text-fg-muted">Vị trí ước tính theo IP, thường chỉ đúng tới cấp thành phố.</p>
      )}
    </div>
  );
}
