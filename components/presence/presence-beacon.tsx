"use client";

import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";
import { HEARTBEAT_MS } from "@/lib/presence";
import { detectDeviceModelClient } from "@/lib/device-detection";

let cachedModel: string | null | undefined;
let cachedGps: {
  latitude: number;
  longitude: number;
  accuracy?: number;
  city?: string;
  region?: string;
} | null = null;
let lastGpsFetch = 0;
const GPS_CACHE_TTL = 3 * 60 * 1000; // 3 minutes

async function getDeviceModel(): Promise<string | undefined> {
  if (cachedModel !== undefined) return cachedModel ?? undefined;
  try {
    cachedModel = await detectDeviceModelClient();
  } catch {
    cachedModel = null;
  }
  return cachedModel ?? undefined;
}

/**
 * Requests high-accuracy GPS coordinates from the browser.
 * When the user allows location access, returns exact latitude/longitude (~5-15m accuracy).
 */
async function fetchGpsLocation(): Promise<typeof cachedGps> {
  if (typeof window === "undefined" || !("geolocation" in navigator)) {
    return null;
  }

  const now = Date.now();
  if (cachedGps && now - lastGpsFetch < GPS_CACHE_TTL) {
    return cachedGps;
  }

  return new Promise((resolve) => {
    try {
      navigator.geolocation.getCurrentPosition(
        async (pos) => {
          const lat = pos.coords.latitude;
          const lng = pos.coords.longitude;
          const accuracy = pos.coords.accuracy;

          let city: string | undefined;
          let region: string | undefined;

          // Attempt client-side reverse geocode for exact ward/district/city
          try {
            const res = await fetch(
              `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${lat}&longitude=${lng}&localityLanguage=vi`,
              { signal: AbortSignal.timeout(3000) },
            );
            if (res.ok) {
              const data = await res.json();
              city = data.locality || data.city;
              region = data.principalSubdivision;
            }
          } catch {
            // Geocode failed or timed out; coordinates remain exact
          }

          cachedGps = { latitude: lat, longitude: lng, accuracy, city, region };
          lastGpsFetch = Date.now();
          resolve(cachedGps);
        },
        () => {
          resolve(cachedGps);
        },
        {
          enableHighAccuracy: true,
          timeout: 8000,
          maximumAge: 60000,
        },
      );
    } catch {
      resolve(null);
    }
  });
}

function beat(path: string) {
  if (typeof document === "undefined" || document.visibilityState !== "visible") return;
  if (typeof navigator !== "undefined" && !navigator.onLine) return;

  const timezone =
    typeof Intl !== "undefined" ? Intl.DateTimeFormat().resolvedOptions().timeZone : undefined;

  void Promise.all([getDeviceModel(), fetchGpsLocation()]).then(([deviceModel, gps]) => {
    void fetch("/api/presence", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        path,
        deviceModel,
        timezone,
        latitude: gps?.latitude,
        longitude: gps?.longitude,
        accuracy: gps?.accuracy,
        city: gps?.city,
        region: gps?.region,
      }),
      keepalive: true,
      cache: "no-store",
    }).catch(() => undefined);
  });
}

/** Tells the server this person is here (every 45 s while the tab is visible). Renders nothing. */
export function PresenceBeacon() {
  const pathname = usePathname();
  const pathRef = useRef(pathname);

  useEffect(() => {
    pathRef.current = pathname;
    beat(pathname);
  }, [pathname]);

  useEffect(() => {
    const timer = window.setInterval(() => beat(pathRef.current), HEARTBEAT_MS);
    const onVisible = () => beat(pathRef.current);
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      window.clearInterval(timer);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, []);

  return null;
}
