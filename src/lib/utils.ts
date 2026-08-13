import type { Task, TaskStatus } from "./types";

export const DAY_MS = 86400000;
export const HOUR_MS = 3600000;
export const MINUTE_MS = 60000;

export function cn(...parts: Array<string | false | null | undefined>): string {
  return parts.filter(Boolean).join(" ");
}

export function startOfDay(d: Date): Date {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

export function endOfDay(d: Date): Date {
  const x = new Date(d);
  x.setHours(23, 59, 59, 999);
  return x;
}

export function startOfWeek(d: Date, weekStart = 1): Date {
  const x = startOfDay(d);
  const day = (x.getDay() + 7 - weekStart) % 7;
  x.setDate(x.getDate() - day);
  return x;
}

export function addDays(d: Date, n: number): Date {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
}

export function isSameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

export function isSameMonth(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth();
}

export function monthMatrix(anchor: Date): Date[][] {
  const first = new Date(anchor.getFullYear(), anchor.getMonth(), 1);
  const offset = (first.getDay() + 6) % 7; // weeks start Monday
  const start = addDays(first, -offset);
  const weeks: Date[][] = [];
  for (let w = 0; w < 6; w++) {
    const week: Date[] = [];
    for (let d = 0; d < 7; d++) {
      week.push(addDays(start, w * 7 + d));
    }
    weeks.push(week);
  }
  return weeks;
}

export function formatDayLong(d: Date): string {
  return d.toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  });
}

export function formatDayMedium(d: Date): string {
  return d.toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
  });
}

export function formatShort(d: Date): string {
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export function formatWeekdayShort(d: Date): string {
  return d.toLocaleDateString("en-US", { weekday: "short" });
}

export function formatTime(ts: number): string {
  return new Date(ts).toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
  });
}

export function formatDateTime(ts: number): string {
  return new Date(ts).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
}

export function formatDuration(minutes: number | null): string {
  if (!minutes) return "";
  if (minutes < 60) return `${minutes}m`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m ? `${h}h ${m}m` : `${h}h`;
}

export function relativeTime(ts: number): string {
  const diff = Date.now() - ts;
  const abs = Math.abs(diff);
  const min = Math.round(abs / MINUTE_MS);
  const hr = Math.round(abs / HOUR_MS);
  const day = Math.round(abs / DAY_MS);
  const future = diff < 0;
  const suffix = future ? "from now" : "ago";
  if (min < 1) return "just now";
  if (min < 60) return `${min}m ${suffix}`;
  if (hr < 24) return `${hr}h ${suffix}`;
  if (day < 7) return `${day}d ${suffix}`;
  return formatDateTime(ts);
}

export function isOverdue(task: Pick<Task, "status" | "due_at" | "scheduled_start">): boolean {
  if (task.status === "done" || task.status === "blocked") return false;
  const ref = task.due_at ?? task.scheduled_start;
  if (!ref) return false;
  return ref < Date.now();
}

export function taskStartTime(task: Task): number | null {
  return task.scheduled_start ?? task.due_at;
}

export const STATUS_LABELS: Record<TaskStatus, string> = {
  todo: "Todo",
  in_progress: "In Progress",
  done: "Done",
  blocked: "Blocked",
};

export const STATUS_ORDER: TaskStatus[] = ["todo", "in_progress", "done", "blocked"];

export const PRIORITY_LABELS: Record<string, string> = {
  low: "Low",
  medium: "Medium",
  high: "High",
};

export const PROJECT_COLORS = [
  "#4F8F6B",
  "#5B7FB3",
  "#9B7FB3",
  "#B3825B",
  "#B35B6E",
  "#5B9EB3",
  "#8FA24F",
  "#7A5BB3",
];

export function projectColor(index: number): string {
  return PROJECT_COLORS[index % PROJECT_COLORS.length];
}
