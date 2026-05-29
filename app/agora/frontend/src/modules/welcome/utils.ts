import type { ThreadWeeklyActivityRow } from "@/modules/accesos/services/reportesService";
import type { WeeklyBucket } from "./types";

export const formatDateLabel = (value: string) =>
  new Intl.DateTimeFormat("es-CL", { day: "2-digit", month: "short" }).format(
    new Date(`${value}T12:00:00`),
  );

const toLocalDateKey = (date: Date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const startOfWeek = (date: Date) => {
  const copy = new Date(date);
  copy.setHours(0, 0, 0, 0);
  const diff = copy.getDay() === 0 ? -6 : 1 - copy.getDay();
  copy.setDate(copy.getDate() + diff);
  return copy;
};

const buildEmptyWeeklyBuckets = (totalWeeks = 8): WeeklyBucket[] => {
  const thisWeekStart = startOfWeek(new Date());
  const firstWeekStart = new Date(thisWeekStart);
  firstWeekStart.setDate(firstWeekStart.getDate() - (totalWeeks - 1) * 7);

  const buckets = new Map<string, WeeklyBucket>();
  for (let i = 0; i < totalWeeks; i++) {
    const weekStart = new Date(firstWeekStart);
    weekStart.setDate(firstWeekStart.getDate() + i * 7);
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekStart.getDate() + 6);
    const key = toLocalDateKey(weekStart);
    buckets.set(key, { weekStart: key, weekEnd: toLocalDateKey(weekEnd), total: 0 });
  }
  return Array.from(buckets.values());
};

export const buildWeeklyBuckets = (
  activityRows: ThreadWeeklyActivityRow[],
  totalWeeks = 8,
): WeeklyBucket[] => {
  const buckets = new Map(
    buildEmptyWeeklyBuckets(totalWeeks).map((b) => [b.weekStart, b]),
  );
  activityRows.forEach((row) => {
    const fecha = new Date(`${row.semana_inicio}T12:00:00`);
    if (Number.isNaN(fecha.getTime())) return;
    const key = toLocalDateKey(fecha);
    const current = buckets.get(key);
    if (!current) return;
    current.total = Number(row.threads_distintos || 0);
  });
  return Array.from(buckets.values());
};

export const getWeeklyWindow = (totalWeeks = 8) => {
  const buckets = buildEmptyWeeklyBuckets(totalWeeks);
  return {
    desde: new Date(`${buckets[0].weekStart}T00:00:00`).toISOString(),
    hasta: new Date(`${buckets[buckets.length - 1].weekEnd}T23:59:59`).toISOString(),
  };
};
