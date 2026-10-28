export const CHURN_MIN_ACTIVE_DAYS = 7;
export const CHURN_MIN_INACTIVE_DAYS = 3;
export const CHURN_MAX_INACTIVE_DAYS = 30;
export const STUCK_MIN_ACCOUNT_AGE_DAYS = 2;
export const MULTI_COUNTRY_HOURS = 24;
export const AI_HEAVY_THRESHOLD_RATIO = 0.8;

export type AttentionItem = {
  userId: string;
  name: string;
  username?: string;
  email?: string | null;
  detail: string;
};

export type AttentionGroups = {
  churn: AttentionItem[];
  stuck: AttentionItem[];
  multiCountry: AttentionItem[];
  aiHeavy: AttentionItem[];
};

export type AttentionInput = {
  today: string; // YYYY-MM-DD
  now?: number; // timestamp ms
  aiLimit: number;
  users: {
    id: string;
    displayName: string;
    username?: string;
    email?: string | null;
    createdAt: string;
    activeDays: number;
    lastActiveDay: string | null;
  }[];
  recentLogins24h: {
    userId: string;
    country: string | null;
    city: string | null;
    created_at: string;
  }[];
  aiUsageToday: {
    userId: string;
    requests: number;
  }[];
};

export function computeAttention(input: AttentionInput): AttentionGroups {
  const now = input.now ?? Date.now();
  const todayMs = new Date(`${input.today}T00:00:00Z`).getTime();
  const aiThreshold = Math.floor(input.aiLimit * AI_HEAVY_THRESHOLD_RATIO);

  const churn: AttentionItem[] = [];
  const stuck: AttentionItem[] = [];
  const multiCountry: AttentionItem[] = [];
  const aiHeavy: AttentionItem[] = [];

  // Group 24h logins by user
  const loginsByUser = new Map<string, Set<string>>();
  for (const log of input.recentLogins24h) {
    if (log.country && log.country.trim()) {
      const set = loginsByUser.get(log.userId) ?? new Set<string>();
      set.add(log.country.trim().toUpperCase());
      loginsByUser.set(log.userId, set);
    }
  }

  // Group AI usage by user
  const aiUsageMap = new Map<string, number>();
  for (const u of input.aiUsageToday) {
    aiUsageMap.set(u.userId, (aiUsageMap.get(u.userId) ?? 0) + u.requests);
  }

  for (const user of input.users) {
    // 1. Churn risk: active_days >= 7, last_active_day 3 to 30 days ago
    if (user.activeDays >= CHURN_MIN_ACTIVE_DAYS && user.lastActiveDay) {
      const lastActiveMs = new Date(`${user.lastActiveDay}T00:00:00Z`).getTime();
      const diffDays = Math.round((todayMs - lastActiveMs) / 86_400_000);
      if (diffDays >= CHURN_MIN_INACTIVE_DAYS && diffDays <= CHURN_MAX_INACTIVE_DAYS) {
        churn.push({
          userId: user.id,
          name: user.displayName,
          username: user.username,
          email: user.email,
          detail: `Đã học ${user.activeDays} ngày · Không ôn ${diffDays} ngày qua (lần cuối: ${user.lastActiveDay})`,
        });
      }
    }

    // 2. Stuck accounts: created >= 2 days ago, active_days = 0
    if (user.activeDays === 0) {
      const createdMs = new Date(user.createdAt).getTime();
      const ageDays = Math.floor((now - createdMs) / 86_400_000);
      if (ageDays >= STUCK_MIN_ACCOUNT_AGE_DAYS) {
        stuck.push({
          userId: user.id,
          name: user.displayName,
          username: user.username,
          email: user.email,
          detail: `Đăng ký ${ageDays} ngày trước nhưng chưa học buổi nào`,
        });
      }
    }

    // 3. Multi-country logins: >= 2 distinct countries in last 24h
    const countries = loginsByUser.get(user.id);
    if (countries && countries.size >= 2) {
      multiCountry.push({
        userId: user.id,
        name: user.displayName,
        username: user.username,
        email: user.email,
        detail: `Đăng nhập từ ${countries.size} quốc gia (${[...countries].join(", ")}) trong 24 giờ qua`,
      });
    }

    // 4. AI heavy usage: usage >= 80% daily limit
    const aiUsed = aiUsageMap.get(user.id) ?? 0;
    if (aiUsed >= aiThreshold && input.aiLimit > 0) {
      const pct = Math.round((aiUsed / input.aiLimit) * 100);
      aiHeavy.push({
        userId: user.id,
        name: user.displayName,
        username: user.username,
        email: user.email,
        detail: `Đã dùng ${aiUsed}/${input.aiLimit} lượt (${pct}%) hôm nay`,
      });
    }
  }

  return { churn, stuck, multiCountry, aiHeavy };
}
