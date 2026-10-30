import { tripItemsFor } from "@/lib/bin/catalog";
import type { LangCode } from "@/lib/lang/types";

export const TRIP_MINUTES = 180;
export const TRIP_MIN_REVIEWS = 20;
export const TRIP_MIN_QUESTS = 2;
export const TRIP_ITEM_CHANCE = 0.25;

export type BinStory = {
  lines: { target: string; vi: string }[];
  pinyin?: string[];
  source: "ai" | "template";
};

export type TripStatus =
  | { kind: "locked"; needReviews: number; needQuests: number }
  | { kind: "ready" }
  | { kind: "away"; tripId: string; placeId: string; returnsAt: string }
  | { kind: "back"; tripId: string; placeId: string }
  | { kind: "done" };

export function canStartTrip(i: { reviewsToday: number; questsDone: number }): boolean {
  return i.reviewsToday >= TRIP_MIN_REVIEWS || i.questsDone >= TRIP_MIN_QUESTS;
}

function getZonedParts(date: Date, timeZone: string) {
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "numeric",
    day: "numeric",
    hour: "numeric",
    minute: "numeric",
    second: "numeric",
    hour12: false,
  });
  const parts = formatter.formatToParts(date);
  const map: Record<string, number> = {};
  for (const p of parts) {
    if (p.type !== "literal") map[p.type] = parseInt(p.value, 10);
  }
  return {
    year: map.year ?? 2026,
    month: map.month ?? 1,
    day: map.day ?? 1,
    hour: map.hour === 24 ? 0 : (map.hour ?? 0),
    minute: map.minute ?? 0,
    second: map.second ?? 0,
  };
}

/**
 * Returns when Bin returns. If the return time falls into 22:00–06:59 in the user's timezone,
 * it rolls to 07:00 next morning (or that morning if hour < 7).
 */
export function tripReturnTime(start: Date, timeZone: string, minutes = TRIP_MINUTES): Date {
  const rawReturn = new Date(start.getTime() + minutes * 60_000);
  const parts = getZonedParts(rawReturn, timeZone);
  const hour = parts.hour;
  const minute = parts.minute;
  const second = parts.second;

  const isNightHour = hour >= 22 || hour < 7;
  if (!isNightHour) {
    return rawReturn;
  }

  let forwardMinutes = 0;
  if (hour >= 22) {
    forwardMinutes = (24 - hour) * 60 - minute + 7 * 60;
  } else {
    forwardMinutes = (7 - hour) * 60 - minute;
  }

  const shiftMs = forwardMinutes * 60_000 - second * 1000;
  return new Date(rawReturn.getTime() + shiftMs);
}

export function isOvernight(start: Date, timeZone: string, minutes = TRIP_MINUTES): boolean {
  const rawReturn = new Date(start.getTime() + minutes * 60_000);
  const parts = getZonedParts(rawReturn, timeZone);
  return parts.hour >= 22 || parts.hour < 7;
}

export function tripStatus(i: {
  today: string;
  reviewsToday: number;
  questsDone: number;
  now: Date;
  latest: {
    id: string;
    study_day: string;
    place_id: string;
    returns_at: string;
    collected_at: string | null;
  } | null;
}): TripStatus {
  if (i.latest && i.latest.collected_at === null) {
    if (new Date(i.latest.returns_at).getTime() > i.now.getTime()) {
      return {
        kind: "away",
        tripId: i.latest.id,
        placeId: i.latest.place_id,
        returnsAt: i.latest.returns_at,
      };
    }
    return {
      kind: "back",
      tripId: i.latest.id,
      placeId: i.latest.place_id,
    };
  }

  if (i.latest && i.latest.study_day === i.today) {
    return { kind: "done" };
  }

  if (canStartTrip(i)) {
    return { kind: "ready" };
  }

  return {
    kind: "locked",
    needReviews: Math.max(0, TRIP_MIN_REVIEWS - i.reviewsToday),
    needQuests: Math.max(0, TRIP_MIN_QUESTS - i.questsDone),
  };
}

export function pickWord<T extends { id: string; lapses: number; state: string; last_review: string | null }>(
  candidates: T[],
  rng: () => number,
): T | null {
  if (!candidates || candidates.length === 0) return null;
  const priority1 = candidates.filter((c) => c.state === "learning" || c.state === "relearning" || c.lapses >= 2);
  const pool = priority1.length > 0 ? priority1 : candidates;
  const idx = Math.min(pool.length - 1, Math.floor(rng() * pool.length));
  return pool[idx] ?? null;
}

export function tripReward(i: {
  lang: LangCode;
  owned: Set<string>;
  tripNumber: number;
  rng: () => number;
}): { bones: number; itemId: string | null } {
  const bones = 3 + Math.floor(i.rng() * 4);
  const unowned = tripItemsFor(i.lang, i.owned);
  let itemId: string | null = null;
  if (unowned.length > 0) {
    const getsItem = i.tripNumber === 3 || i.rng() < TRIP_ITEM_CHANCE;
    if (getsItem) {
      const idx = Math.min(unowned.length - 1, Math.floor(i.rng() * unowned.length));
      itemId = unowned[idx].id;
    }
  }
  return { bones, itemId };
}

export function rngFrom(seed: number): () => number {
  let s = Math.floor(seed) >>> 0;
  return function () {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function templateStory(i: {
  lang: LangCode;
  placeName: string;
  landmark: string;
  term: string | null;
  reading?: string | null;
  meaningVi: string | null;
  name: string;
  seed: number;
}): BinStory {
  const rng = rngFrom(i.seed);
  const idx = Math.floor(rng() * 4);

  if (i.lang === "zh") {
    if (i.term) {
      const term = i.term;
      const reading = i.reading || term;
      const meaning = i.meaningVi || term;
      const templates = [
        {
          lines: [
            { target: `我在${i.placeName}看到了${term}。`, vi: `Ở ${i.placeName}, ${i.name} thấy ${meaning}.` },
            { target: `${i.landmark}周围真热闹！`, vi: `Khu vực quanh ${i.landmark} thật náo nhiệt!` },
          ],
          pinyin: [`wǒ zài ${i.placeName} kàn dào le ${reading}.`, `${i.landmark} zhōu wéi zhēn rè nao!`],
        },
        {
          lines: [
            { target: `${i.placeName}的${i.landmark}真美。`, vi: `${i.landmark} ở ${i.placeName} thật đẹp.` },
            { target: `我还学到了一个新词：${term}。`, vi: `${i.name} còn học được một từ mới: ${meaning}.` },
          ],
          pinyin: [`${i.placeName} de ${i.landmark} zhēn měi.`, `wǒ hái xué dào le yí gè xīn cí: ${reading}.`],
        },
        {
          lines: [
            { target: `今天在${i.placeName}散步。`, vi: `Hôm nay đi dạo ở ${i.placeName}.` },
            { target: `在${i.landmark}旁边遇到了${term}。`, vi: `Bên cạnh ${i.landmark}, ${i.name} bắt gặp ${meaning}.` },
          ],
          pinyin: [`jīn tiān zài ${i.placeName} sàn bù.`, `zài ${i.landmark} páng biān yù dào le ${reading}.`],
        },
        {
          lines: [
            { target: `${i.landmark}附近有一个${term}。`, vi: `Gần ${i.landmark} có một ${meaning}.` },
            { target: `这里的景色很有意思。`, vi: `Cảnh sắc nơi này thật thú vị.` },
          ],
          pinyin: [`${i.landmark} fù jìn yǒu yí gè ${reading}.`, `zhè lǐ de jǐng sè hěn yǒu yì si.`],
        },
      ];
      const picked = templates[idx % templates.length];
      return { lines: picked.lines, pinyin: picked.pinyin, source: "template" };
    }

    const noWordTemplates = [
      {
        lines: [
          { target: `今天在${i.placeName}散步。`, vi: `Hôm nay đi dạo ở ${i.placeName}.` },
          { target: `参观了著名的${i.landmark}。`, vi: `${i.name} đã ghé thăm ${i.landmark} nổi tiếng.` },
        ],
        pinyin: [`jīn tiān zài ${i.placeName} sàn bù.`, `cān guān le zhù míng de ${i.landmark}.`],
      },
      {
        lines: [
          { target: `${i.placeName}的${i.landmark}真的很壮观。`, vi: `${i.landmark} ở ${i.placeName} thật sự rất hoành tráng.` },
          { target: `散步让我心情很好。`, vi: `Đi dạo khiến tâm trạng ${i.name} rất vui.` },
        ],
        pinyin: [`${i.placeName} de ${i.landmark} zhēn de hěn zhuàng guān.`, `sàn bù ràng wǒ xīn qíng hěn hǎo.`],
      },
      {
        lines: [
          { target: `${i.name}在${i.placeName}度过了美好的一天。`, vi: `${i.name} đã trải qua một ngày thật đẹp ở ${i.placeName}.` },
          { target: `${i.landmark}前拍了很多照片。`, vi: `Đã chụp rất nhiều ảnh trước ${i.landmark}.` },
        ],
        pinyin: [`${i.name} zài ${i.placeName} dù guò le měi hǎo de yì tiān.`, `${i.landmark} qián pāi le hěn duō zhào piàn.`],
      },
      {
        lines: [
          { target: `微风吹拂着${i.placeName}。`, vi: `Gió nhẹ thổi qua ${i.placeName}.` },
          { target: `${i.landmark}格外迷人。`, vi: `${i.landmark} trông thật cuốn hút.` },
        ],
        pinyin: [`wēi fēng chuī fú zhe ${i.placeName}.`, `${i.landmark} gé wài mí rén.`],
      },
    ];
    const picked = noWordTemplates[idx % noWordTemplates.length];
    return { lines: picked.lines, pinyin: picked.pinyin, source: "template" };
  }

  // en
  if (i.term) {
    const term = i.term;
    const meaning = i.meaningVi || term;
    const templates = [
      {
        lines: [
          { target: `In ${i.placeName}, I saw a ${term} near ${i.landmark}.`, vi: `Ở ${i.placeName}, ${i.name} thấy một ${meaning} gần ${i.landmark}.` },
          { target: `It was such a peaceful moment.`, vi: `Đó là một khoảnh khắc thật bình yên.` },
        ],
      },
      {
        lines: [
          { target: `${i.name} walked around ${i.landmark} in ${i.placeName}.`, vi: `${i.name} đi dạo quanh ${i.landmark} ở ${i.placeName}.` },
          { target: `I found a curious ${term} along the way.`, vi: `${i.name} tìm thấy một ${meaning} trên đường đi.` },
        ],
      },
      {
        lines: [
          { target: `What a wonderful day exploring ${i.placeName}!`, vi: `Một ngày thật tuyệt khi khám phá ${i.placeName}!` },
          { target: `The ${term} near ${i.landmark} was unforgettable.`, vi: `${meaning} cạnh ${i.landmark} thật khó quên.` },
        ],
      },
      {
        lines: [
          { target: `Visiting ${i.landmark} in ${i.placeName} was exciting.`, vi: `Đến thăm ${i.landmark} ở ${i.placeName} thật hào hứng.` },
          { target: `It reminded me of the word ${term}.`, vi: `Nơi này làm ${i.name} nhớ đến từ ${meaning}.` },
        ],
      },
    ];
    const picked = templates[idx % templates.length];
    return { lines: picked.lines, source: "template" };
  }

  const noWordTemplates = [
    {
      lines: [
        { target: `Today I took a peaceful walk around ${i.landmark} in ${i.placeName}.`, vi: `Hôm nay ${i.name} đi dạo quanh ${i.landmark} ở ${i.placeName}.` },
        { target: `The weather was simply perfect.`, vi: `Thời tiết thật sự rất dễ chịu.` },
      ],
    },
    {
      lines: [
        { target: `${i.placeName} is so beautiful, especially around ${i.landmark}.`, vi: `${i.placeName} thật đẹp, nhất là khu vực quanh ${i.landmark}.` },
        { target: `I enjoyed every single minute here.`, vi: `${i.name} đã tận hưởng từng phút giây ở nơi này.` },
      ],
    },
    {
      lines: [
        { target: `${i.name} had a great time visiting ${i.landmark} in ${i.placeName}.`, vi: `${i.name} có một khoảng thời gian tuyệt vời khi ghé ${i.landmark} ở ${i.placeName}.` },
        { target: `So many memories to cherish from this trip.`, vi: `Rất nhiều kỷ niệm đáng nhớ từ chuyến đi này.` },
      ],
    },
    {
      lines: [
        { target: `A lovely afternoon at ${i.landmark} in the city of ${i.placeName}.`, vi: `Một buổi chiều dễ thương tại ${i.landmark} ở ${i.placeName}.` },
        { target: `Can't wait for our next adventure together.`, vi: `Không thể chờ đợi chuyến phiêu lưu tiếp theo.` },
      ],
    },
  ];
  const picked = noWordTemplates[idx % noWordTemplates.length];
  return { lines: picked.lines, source: "template" };
}
