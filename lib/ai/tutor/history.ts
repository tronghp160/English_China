import { addDays, studyDay } from "@/lib/srs/streak";

export type ThreadSummary = {
  id: string;
  title: string | null;
  updated_at: string;
};

export type DayGroup = "today" | "yesterday" | "last7" | "older";

export type ThreadGroup = {
  key: DayGroup;
  label: string;
  threads: ThreadSummary[];
};

export const GROUP_LABELS: Record<DayGroup, string> = {
  today: "Hôm nay",
  yesterday: "Hôm qua",
  last7: "7 ngày qua",
  older: "Cũ hơn",
};

/** Groups threads by study day in the learner's timezone: Hôm nay, Hôm qua, 7 ngày qua, Cũ hơn. Pure. */
export function groupThreadsByDay(
  threads: ThreadSummary[],
  now: Date,
  timeZone: string,
): ThreadGroup[] {
  const todayStr = studyDay(now, timeZone);
  const yesterdayStr = addDays(todayStr, -1);
  const sevenDaysAgoStr = addDays(todayStr, -7);

  const groups: Record<DayGroup, ThreadSummary[]> = {
    today: [],
    yesterday: [],
    last7: [],
    older: [],
  };

  for (const t of threads) {
    const threadDate = new Date(t.updated_at);
    const day = studyDay(threadDate, timeZone);

    if (day >= todayStr) {
      groups.today.push(t);
    } else if (day === yesterdayStr) {
      groups.yesterday.push(t);
    } else if (day >= sevenDaysAgoStr) {
      groups.last7.push(t);
    } else {
      groups.older.push(t);
    }
  }

  const result: ThreadGroup[] = [];
  const order: DayGroup[] = ["today", "yesterday", "last7", "older"];
  for (const key of order) {
    if (groups[key].length > 0) {
      result.push({
        key,
        label: GROUP_LABELS[key],
        threads: groups[key],
      });
    }
  }
  return result;
}
