import { placeLabel } from "@/lib/presence";
import { levelFromXp } from "@/lib/progress";

export type BaseLoginEvent = {
  country?: string | null;
  region?: string | null;
  city?: string | null;
  device_type?: string | null;
  browser?: string | null;
  os?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  created_at: string;
};

export type FlaggedLoginEvent<T extends BaseLoginEvent> = T & {
  newPlace: boolean;
  newDevice: boolean;
};

export type PlaceSummary = {
  label: string;
  city: string | null;
  region: string | null;
  country: string | null;
  latitude: number | null;
  longitude: number | null;
  count: number;
  lastAt: string;
};

/**
 * Flags login events with newPlace and newDevice.
 * `events` are sorted newest first. The oldest event has newPlace: false, newDevice: false.
 * For later events, newPlace is true if this country|region|city has never appeared in older events.
 * Similarly for device_type|browser|os.
 */
export function flagLoginEvents<T extends BaseLoginEvent>(
  events: T[],
): FlaggedLoginEvent<T>[] {
  if (events.length === 0) return [];

  // Order from oldest to newest for sequential tracking
  const reversed = [...events].reverse();
  const seenPlaces = new Set<string>();
  const seenDevices = new Set<string>();

  const flaggedReversed: FlaggedLoginEvent<T>[] = [];

  for (let i = 0; i < reversed.length; i++) {
    const ev = reversed[i];
    const placeKey = `${ev.country ?? ""}|${ev.region ?? ""}|${ev.city ?? ""}`;
    const hasPlace = Boolean(ev.country || ev.region || ev.city);

    const deviceKey = `${ev.device_type ?? ""}|${ev.browser ?? ""}|${ev.os ?? ""}`;
    const hasDevice = Boolean(
      (ev.device_type && ev.device_type !== "unknown") ||
        (ev.browser && ev.browser !== "Không rõ") ||
        (ev.os && ev.os !== "Không rõ"),
    );

    if (i === 0) {
      if (hasPlace) seenPlaces.add(placeKey);
      if (hasDevice) seenDevices.add(deviceKey);
      flaggedReversed.push({
        ...ev,
        newPlace: false,
        newDevice: false,
      });
    } else {
      const isNewPlace = hasPlace && !seenPlaces.has(placeKey);
      const isNewDevice = hasDevice && !seenDevices.has(deviceKey);

      if (hasPlace) seenPlaces.add(placeKey);
      if (hasDevice) seenDevices.add(deviceKey);

      flaggedReversed.push({
        ...ev,
        newPlace: isNewPlace,
        newDevice: isNewDevice,
      });
    }
  }

  // Restore newest first
  return flaggedReversed.reverse();
}

/**
 * Aggregates login events into place summaries, sorted by count desc.
 */
export function aggregatePlaces<T extends BaseLoginEvent>(events: T[]): PlaceSummary[] {
  const map = new Map<string, PlaceSummary>();

  for (const ev of events) {
    const country = ev.country ?? null;
    const region = ev.region ?? null;
    const city = ev.city ?? null;
    const key = `${country ?? ""}|${region ?? ""}|${city ?? ""}`;

    const existing = map.get(key);
    if (existing) {
      existing.count += 1;
      if (new Date(ev.created_at).getTime() > new Date(existing.lastAt).getTime()) {
        existing.lastAt = ev.created_at;
      }
      if (ev.latitude != null && ev.longitude != null && existing.latitude == null) {
        existing.latitude = ev.latitude;
        existing.longitude = ev.longitude;
      }
    } else {
      map.set(key, {
        label: placeLabel({ city, region, country }),
        city,
        region,
        country,
        latitude: ev.latitude ?? null,
        longitude: ev.longitude ?? null,
        count: 1,
        lastAt: ev.created_at,
      });
    }
  }

  return [...map.values()].sort((a, b) => b.count - a.count);
}

export type UserFilterRow = {
  id: string;
  email: string | null;
  displayName: string;
  username: string;
  createdAt: string;
  isBanned: boolean;
  isAdmin: boolean;
  lastSeenAt?: string | null;
  status: "online" | "away" | "offline" | "never";
  totalXp: number;
  activeDays: number;
  lastActiveDay?: string | null;
};

/**
 * Filters and sorts users according to admin criteria.
 */
export function filterAndSortUsers<T extends UserFilterRow>(
  users: T[],
  options: {
    q?: string;
    status?: string;
    sort?: string;
    now?: number;
    today?: string;
  },
): T[] {
  const now = options.now ?? Date.now();
  const q = options.q?.trim().toLowerCase();
  const status = options.status ?? "all";
  const sort = options.sort ?? "created";
  const sevenDaysAgoMs = now - 7 * 86_400_000;

  let filtered = users;

  if (q) {
    filtered = filtered.filter(
      (u) =>
        (u.email && u.email.toLowerCase().includes(q)) ||
        (u.username && u.username.toLowerCase().includes(q)) ||
        (u.displayName && u.displayName.toLowerCase().includes(q)),
    );
  }

  if (status !== "all") {
    filtered = filtered.filter((u) => {
      switch (status) {
        case "online":
          return u.status === "online";
        case "away":
          return u.status === "away";
        case "offline":
          return u.status === "offline";
        case "never":
          return u.status === "never";
        case "banned":
          return u.isBanned;
        case "admin":
          return u.isAdmin;
        case "unstudied":
          return u.activeDays === 0;
        case "inactive7": {
          // Inactive 7+ days: lastActiveDay >= 7 days ago, or null if account >= 7 days old
          const createdMs = new Date(u.createdAt).getTime();
          if (!u.lastActiveDay) {
            return createdMs <= sevenDaysAgoMs;
          }
          const lastActiveMs = new Date(u.lastActiveDay).getTime();
          return lastActiveMs <= sevenDaysAgoMs;
        }
        default:
          return true;
      }
    });
  }

  filtered.sort((a, b) => {
    switch (sort) {
      case "lastSeen": {
        const aSeen = a.lastSeenAt ? new Date(a.lastSeenAt).getTime() : 0;
        const bSeen = b.lastSeenAt ? new Date(b.lastSeenAt).getTime() : 0;
        if (aSeen === 0 && bSeen === 0) return 0;
        if (aSeen === 0) return 1;
        if (bSeen === 0) return -1;
        return bSeen - aSeen;
      }
      case "level": {
        const aLvl = levelFromXp(a.totalXp).level;
        const bLvl = levelFromXp(b.totalXp).level;
        if (aLvl === bLvl) return b.totalXp - a.totalXp;
        return bLvl - aLvl;
      }
      case "lastActive": {
        const aAct = a.lastActiveDay ? new Date(a.lastActiveDay).getTime() : 0;
        const bAct = b.lastActiveDay ? new Date(b.lastActiveDay).getTime() : 0;
        if (aAct === 0 && bAct === 0) return 0;
        if (aAct === 0) return 1;
        if (bAct === 0) return -1;
        return bAct - aAct;
      }
      case "created":
      default:
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    }
  });

  return filtered;
}

export type LevelBuckets = {
  "1-2": number;
  "3-4": number;
  "5-9": number;
  "10+": number;
};

export function bucketLevels(users: { totalXp: number }[]): LevelBuckets {
  const buckets: LevelBuckets = {
    "1-2": 0,
    "3-4": 0,
    "5-9": 0,
    "10+": 0,
  };

  for (const u of users) {
    const lvl = levelFromXp(u.totalXp).level;
    if (lvl <= 2) {
      buckets["1-2"] += 1;
    } else if (lvl <= 4) {
      buckets["3-4"] += 1;
    } else if (lvl <= 9) {
      buckets["5-9"] += 1;
    } else {
      buckets["10+"] += 1;
    }
  }

  return buckets;
}

export function computeDauWauMau(
  rows: { user_id: string; day: string }[],
  today: string,
): { dau: number; wau: number; mau: number } {
  const todayMs = new Date(`${today}T00:00:00Z`).getTime();
  const sevenDaysAgoMs = todayMs - 6 * 86_400_000; // 7 days inclusive: today - 6 days
  const thirtyDaysAgoMs = todayMs - 29 * 86_400_000; // 30 days inclusive

  const dauSet = new Set<string>();
  const wauSet = new Set<string>();
  const mauSet = new Set<string>();

  for (const r of rows) {
    const dayMs = new Date(`${r.day}T00:00:00Z`).getTime();
    if (r.day === today) {
      dauSet.add(r.user_id);
    }
    if (dayMs >= sevenDaysAgoMs && dayMs <= todayMs) {
      wauSet.add(r.user_id);
    }
    if (dayMs >= thirtyDaysAgoMs && dayMs <= todayMs) {
      mauSet.add(r.user_id);
    }
  }

  return {
    dau: dauSet.size,
    wau: wauSet.size,
    mau: mauSet.size,
  };
}
