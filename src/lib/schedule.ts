import { parse, type ParsedResult } from "chrono-node";
import { DAY_MS, HOUR_MS, addDays, endOfDay, startOfDay, startOfWeek } from "./utils";

export interface ParsedSchedule {
  title: string;
  due_at: number | null;
  scheduled_start: number | null;
  scheduled_end: number | null;
}

export type PresetKind = "today" | "tomorrow" | "weekend" | "nextweek";

const DEFAULT_DURATION_MS = 2 * HOUR_MS;

function stripSpan(text: string, start: number, end: number): string {
  let s = start;
  const pre = text.slice(0, s).match(/(due|by|at|@)\s*$/i);
  if (pre) s -= pre[0].length;
  return (text.slice(0, s) + text.slice(end)).trim();
}

function defaultTimeFor(d: Date): Date {
  const out = startOfDay(d);
  const today = startOfDay(new Date());
  if (out.getTime() === today.getTime()) {
    const x = new Date();
    x.setHours(x.getHours() + 1, 0, 0, 0);
    out.setHours(x.getHours(), x.getMinutes(), 0, 0);
  } else {
    out.setHours(9, 0, 0, 0);
  }
  return out;
}

function nthOfMonth(day: number, ref = new Date()): Date {
  const clamped = Math.min(day, new Date(ref.getFullYear(), ref.getMonth() + 1, 0).getDate());
  let d = new Date(ref.getFullYear(), ref.getMonth(), clamped, 12, 0, 0, 0);
  if (clamped < ref.getDate()) {
    d = new Date(ref.getFullYear(), ref.getMonth() + 1, clamped, 12, 0, 0, 0);
  }
  return d;
}

export function parseSchedule(raw: string): ParsedSchedule {
  let text = raw.trim();
  let dueOnly = false;
  const prefix = text.match(/^(due|by)\s+(.+)$/i);
  if (prefix) {
    dueOnly = true;
    text = prefix[2];
  }

  const results = parse(text, new Date(), { forwardDate: true });
  let hit: ParsedResult | null = null;
  for (const r of results) {
    if (!hit || r.text.length > hit.text.length) hit = r;
  }

  const dueKw = !dueOnly ? text.match(/\b(due|by)\b/i) : null;
  if (dueKw && hit && hit.index > (dueKw.index ?? 0)) dueOnly = true;

  const ordinal = text.match(/(^|\s)(\d{1,2})(st|nd|rd|th)\b/i);

  let due_at: number | null = null;
  let scheduled_start: number | null = null;
  let scheduled_end: number | null = null;

  const applyOrdinal = (date: Date) => {
    const d = defaultTimeFor(date);
    if (dueOnly) {
      due_at = endOfDay(d).getTime();
    } else {
      scheduled_start = d.getTime();
      scheduled_end = d.getTime() + DEFAULT_DURATION_MS;
    }
  };

  if (hit) {
    const parsed = hit.start.date();
    const certainHour = hit.start.isCertain("hour");
    const start = certainHour ? parsed : defaultTimeFor(parsed);
    if (dueOnly) {
      due_at = endOfDay(start).getTime();
    } else {
      scheduled_start = start.getTime();
      let endMs: number | null = null;
      if (hit.end) {
        if (hit.end.isCertain("hour")) {
          endMs = hit.end.date().getTime();
        } else {
          const endDay = startOfDay(hit.end.date());
          endDay.setHours(17, 0, 0, 0);
          endMs = endDay.getTime();
        }
      }
      if (!endMs) endMs = start.getTime() + DEFAULT_DURATION_MS;
      if (endMs <= start.getTime()) endMs += DAY_MS;
      scheduled_end = endMs;
    }
    text = stripSpan(text, hit.index, hit.index + hit.text.length);
  } else if (ordinal) {
    applyOrdinal(nthOfMonth(Number(ordinal[2])));
    const oi = ordinal.index ?? 0;
    const start = (ordinal[1] ? oi + 1 : oi);
    text = stripSpan(text, start, oi + ordinal[0].length).trim();
  }

  return {
    title: text.replace(/\s+/g, " ").trim(),
    due_at,
    scheduled_start,
    scheduled_end,
  };
}

export function presetDate(kind: PresetKind, ref = new Date()): Date {
  const today = startOfDay(ref);
  switch (kind) {
    case "today":
      return today;
    case "tomorrow":
      return addDays(today, 1);
    case "weekend": {
      let d = today;
      while (d.getDay() !== 6) d = addDays(d, 1);
      return d;
    }
    case "nextweek":
      return addDays(startOfWeek(ref), 7);
  }
}

export function presetLabel(kind: PresetKind): string {
  switch (kind) {
    case "today":
      return "Today";
    case "tomorrow":
      return "Tomorrow";
    case "weekend":
      return "Weekend";
    case "nextweek":
      return "Next week";
  }
}

const DAY_FMT: Intl.DateTimeFormatOptions = {
  weekday: "short",
  month: "short",
  day: "numeric",
};
const TIME_FMT: Intl.DateTimeFormatOptions = { hour: "numeric", minute: "2-digit" };

export function scheduleSummary(v: {
  due_at: number | null;
  scheduled_start: number | null;
  scheduled_end: number | null;
}): string | null {
  const parts: string[] = [];
  if (v.scheduled_start) {
    const day = new Date(v.scheduled_start).toLocaleDateString("en-US", DAY_FMT);
    const start = new Date(v.scheduled_start).toLocaleTimeString("en-US", TIME_FMT);
    const end = v.scheduled_end
      ? new Date(v.scheduled_end).toLocaleTimeString("en-US", TIME_FMT)
      : null;
    parts.push(end && end !== start ? `${day} ${start}–${end}` : `${day} ${start}`);
  }
  if (v.due_at) {
    parts.push(`Due ${new Date(v.due_at).toLocaleDateString("en-US", DAY_FMT)}`);
  }
  return parts.length ? parts.join(" · ") : null;
}
