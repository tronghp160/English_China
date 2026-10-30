import type { Tone } from "@/lib/tone";
import type { LangCode } from "@/lib/lang/types";

export type TripPlace = {
  id: string;
  lang: LangCode;
  name: string;
  landmark: string;
  tone: Tone;
};

export const PLACES: TripPlace[] = [
  // en: 12 places
  { id: "london", lang: "en", name: "London", landmark: "Tháp đồng hồ Big Ben", tone: "blue" },
  { id: "oxford", lang: "en", name: "Oxford", landmark: "Thư viện Bodleian", tone: "grape" },
  { id: "edinburgh", lang: "en", name: "Edinburgh", landmark: "Lâu đài Edinburgh", tone: "grape" },
  { id: "dublin", lang: "en", name: "Dublin", landmark: "Đại học Trinity", tone: "mint" },
  { id: "new_york", lang: "en", name: "New York", landmark: "Tượng Nữ thần Tự do", tone: "sun" },
  { id: "san_francisco", lang: "en", name: "San Francisco", landmark: "Cầu Cổng Vàng", tone: "orange" },
  { id: "toronto", lang: "en", name: "Toronto", landmark: "Tháp CN", tone: "teal" },
  { id: "sydney", lang: "en", name: "Sydney", landmark: "Nhà hát Con Sò", tone: "coral" },
  { id: "melbourne", lang: "en", name: "Melbourne", landmark: "Nhà ga Flinders Street", tone: "pink" },
  { id: "auckland", lang: "en", name: "Auckland", landmark: "Tháp Sky Tower", tone: "mint" },
  { id: "cape_town", lang: "en", name: "Cape Town", landmark: "Núi Bàn", tone: "sun" },
  { id: "singapore", lang: "en", name: "Singapore", landmark: "Công viên Merlion", tone: "teal" },

  // zh: 12 places
  { id: "beijing", lang: "zh", name: "Bắc Kinh", landmark: "Tử Cấm Thành", tone: "coral" },
  { id: "shanghai", lang: "zh", name: "Thượng Hải", landmark: "Tháp Bến Thượng Hải", tone: "blue" },
  { id: "xian", lang: "zh", name: "Tây An", landmark: "Đội quân Đất nung", tone: "orange" },
  { id: "hangzhou", lang: "zh", name: "Hàng Châu", landmark: "Tây Hồ", tone: "mint" },
  { id: "suzhou", lang: "zh", name: "Tô Châu", landmark: "Khu vườn cổ điển", tone: "teal" },
  { id: "chengdu", lang: "zh", name: "Thành Đô", landmark: "Khu bảo tồn Gấu trúc", tone: "sun" },
  { id: "guilin", lang: "zh", name: "Quế Lâm", landmark: "Sông Li", tone: "mint" },
  { id: "lijiang", lang: "zh", name: "Lệ Giang", landmark: "Phố cổ Lệ Giang", tone: "grape" },
  { id: "harbin", lang: "zh", name: "Cáp Nhĩ Tân", landmark: "Lễ hội Băng đăng", tone: "blue" },
  { id: "guangzhou", lang: "zh", name: "Quảng Châu", landmark: "Tháp Quảng Châu", tone: "pink" },
  { id: "hong_kong", lang: "zh", name: "Hồng Kông", landmark: "Cảng Victoria", tone: "blue" },
  { id: "taipei", lang: "zh", name: "Đài Bắc", landmark: "Tòa tháp Đài Bắc 101", tone: "teal" },
];

const PLACES_BY_ID = new Map<string, TripPlace>(PLACES.map((p) => [p.id, p]));

export function placesFor(lang: LangCode): TripPlace[] {
  return PLACES.filter((p) => p.lang === lang);
}

export function placeById(id: string): TripPlace | undefined {
  return PLACES_BY_ID.get(id);
}

export function pickPlace(lang: LangCode, visited: Set<string>, rng: () => number): TripPlace {
  const pool = placesFor(lang);
  const unvisited = pool.filter((p) => !visited.has(p.id));
  const candidatePool = unvisited.length > 0 ? unvisited : pool;
  const idx = Math.min(candidatePool.length - 1, Math.floor(rng() * candidatePool.length));
  return candidatePool[idx];
}
