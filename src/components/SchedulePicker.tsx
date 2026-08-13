import { useMemo, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import {
  cn,
  endOfDay,
  isSameDay,
  isSameMonth,
  monthMatrix,
  startOfDay,
} from "../lib/utils";
import {
  presetDate,
  presetLabel,
  scheduleSummary,
  type PresetKind,
} from "../lib/schedule";

export interface ScheduleValue {
  due_at: number | null;
  scheduled_start: number | null;
  scheduled_end: number | null;
  estimated_duration: number | null;
}

const TIME_CHIPS: Array<{ label: string; h: number }> = [
  { label: "Morning", h: 9 },
  { label: "Noon", h: 12 },
  { label: "Afternoon", h: 15 },
  { label: "Evening", h: 18 },
];

const DURATION_CHIPS: Array<{ label: string; m: number }> = [
  { label: "15m", m: 15 },
  { label: "30m", m: 30 },
  { label: "1h", m: 60 },
  { label: "2h", m: 120 },
];

function timeValue(ts: number | null): string {
  if (!ts) return "";
  const d = new Date(ts);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export default function SchedulePicker({
  value,
  onChange,
}: {
  value: ScheduleValue;
  onChange: (v: ScheduleValue) => void;
}) {
  const [mode, setMode] = useState<"schedule" | "due">(
    value.scheduled_start ? "schedule" : value.due_at ? "due" : "schedule"
  );
  const [anchor, setAnchor] = useState(() => {
    const base = value.scheduled_start ?? value.due_at;
    return startOfDay(new Date(base ?? Date.now()));
  });

  const activeTs = mode === "due" ? value.due_at : value.scheduled_start;
  const duration = value.estimated_duration ?? 60;

  const applyDay = (day: Date) => {
    if (mode === "due") {
      onChange({ ...value, due_at: endOfDay(day).getTime() });
      return;
    }
    const keep = value.scheduled_start ? new Date(value.scheduled_start) : null;
    const start = startOfDay(day);
    start.setHours(keep ? keep.getHours() : 9, keep ? keep.getMinutes() : 0, 0, 0);
    onChange({
      ...value,
      scheduled_start: start.getTime(),
      scheduled_end: start.getTime() + duration * 60000,
    });
  };

  const applyTime = (h: number, m = 0) => {
    const start = value.scheduled_start ? new Date(value.scheduled_start) : startOfDay(new Date());
    start.setHours(h, m, 0, 0);
    onChange({
      ...value,
      scheduled_start: start.getTime(),
      scheduled_end: start.getTime() + duration * 60000,
    });
  };

  const applyDuration = (mins: number) => {
    if (!value.scheduled_start) return;
    onChange({
      ...value,
      estimated_duration: mins,
      scheduled_end: value.scheduled_start + mins * 60000,
    });
  };

  const applyPreset = (kind: PresetKind) => {
    const day = presetDate(kind);
    if (mode === "due") {
      onChange({ ...value, due_at: endOfDay(day).getTime() });
    } else {
      applyDay(day);
    }
  };

  const clearActive = () => {
    if (mode === "due") onChange({ ...value, due_at: null });
    else onChange({ ...value, scheduled_start: null, scheduled_end: null });
  };

  const weeks = useMemo(() => monthMatrix(anchor), [anchor]);
  const today = startOfDay(new Date());
  const summary = scheduleSummary(value);

  return (
    <div className="w-full space-y-3">
      <div className="flex gap-1 rounded-lg bg-surface-soft p-1 dark:bg-surface-dark">
        {(["schedule", "due"] as const).map((m) => (
          <button
            key={m}
            onClick={() => setMode(m)}
            className={cn(
              "flex-1 rounded-md px-2 py-1 text-[12px] font-medium capitalize transition-colors",
              mode === m
                ? "bg-surface text-ink shadow-sm dark:bg-surface-dark-card dark:text-[#e8efe9]"
                : "text-muted hover:text-ink dark:hover:text-[#e8efe9]"
            )}
          >
            {m === "schedule" ? "Schedule" : "Due date"}
          </button>
        ))}
      </div>

      <div className="flex flex-wrap gap-1">
        {(["today", "tomorrow", "weekend", "nextweek"] as PresetKind[]).map((k) => (
          <button
            key={k}
            onClick={() => applyPreset(k)}
            className={cn(
              "rounded-full border px-2.5 py-1 text-[11.5px] font-medium transition-colors",
              activeTs && isSameDay(new Date(activeTs), presetDate(k))
                ? "border-br bg-br-light text-br-deep dark:border-[#5f9d7c] dark:bg-br-light-dark dark:text-[#a7d3ba]"
                : "border-line text-muted hover:border-br hover:text-br-deep dark:border-line-dark dark:text-[#cfd9d2] dark:hover:text-[#a7d3ba]"
            )}
          >
            {presetLabel(k)}
          </button>
        ))}
      </div>

      <div className="rounded-lg border border-line p-2 dark:border-line-dark">
        <div className="mb-1 flex items-center justify-between">
          <button
            className="rounded p-0.5 text-muted hover:text-ink dark:hover:text-[#e8efe9]"
            aria-label="Previous month"
            onClick={() =>
              setAnchor((a) => new Date(a.getFullYear(), a.getMonth() - 1, 1))
            }
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <span className="text-[12px] font-medium text-ink dark:text-[#e8efe9]">
            {anchor.toLocaleDateString("en-US", { month: "long", year: "numeric" })}
          </span>
          <button
            className="rounded p-0.5 text-muted hover:text-ink dark:hover:text-[#e8efe9]"
            aria-label="Next month"
            onClick={() =>
              setAnchor((a) => new Date(a.getFullYear(), a.getMonth() + 1, 1))
            }
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
        <div className="grid grid-cols-7">
          {["M", "T", "W", "T", "F", "S", "S"].map((d, i) => (
            <div
              key={i}
              className="pb-0.5 text-center text-[10px] font-medium uppercase text-faint"
            >
              {d}
            </div>
          ))}
        </div>
        <div className="grid grid-cols-7">
          {weeks.flat().map((day) => {
            const sel = activeTs && isSameDay(day, new Date(activeTs));
            const isToday = isSameDay(day, today);
            const inMonth = isSameMonth(day, anchor);
            return (
              <button
                key={day.getTime()}
                onClick={() => applyDay(day)}
                className={cn(
                  "mx-auto flex h-7 w-7 items-center justify-center rounded-full text-[12px] transition-colors",
                  sel
                    ? "bg-br font-semibold text-white"
                    : isToday
                      ? "text-br-deep dark:text-[#a7d3ba]"
                      : inMonth
                        ? "text-ink hover:bg-surface-soft dark:text-[#e8efe9] dark:hover:bg-surface-dark"
                        : "text-faint"
                )}
              >
                {day.getDate()}
              </button>
            );
          })}
        </div>
      </div>

      {mode === "schedule" ? (
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <span className="w-14 shrink-0 text-[11px] font-medium uppercase tracking-wider text-faint">
              Start
            </span>
            <div className="flex flex-1 flex-wrap items-center gap-1">
              {TIME_CHIPS.map((c) => (
                <button
                  key={c.label}
                  onClick={() => applyTime(c.h)}
                  className={cn(
                    "rounded-full border px-2 py-0.5 text-[11px] transition-colors",
                    value.scheduled_start &&
                      new Date(value.scheduled_start).getHours() === c.h &&
                      new Date(value.scheduled_start).getMinutes() === 0
                      ? "border-br bg-br-light text-br-deep dark:border-[#5f9d7c] dark:bg-br-light-dark dark:text-[#a7d3ba]"
                      : "border-line text-muted hover:border-br hover:text-br-deep dark:border-line-dark dark:hover:text-[#a7d3ba]"
                  )}
                >
                  {c.label}
                </button>
              ))}
              <input
                type="time"
                value={timeValue(value.scheduled_start)}
                onChange={(e) => {
                  if (!e.target.value) return;
                  const [h, m] = e.target.value.split(":").map(Number);
                  applyTime(h, m);
                }}
                className="input ml-auto w-[86px] shrink-0 py-0.5 text-[11px]"
              />
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-14 shrink-0 text-[11px] font-medium uppercase tracking-wider text-faint">
              Duration
            </span>
            <div className="flex flex-1 flex-wrap items-center gap-1">
              {DURATION_CHIPS.map((c) => (
                <button
                  key={c.m}
                  onClick={() => applyDuration(c.m)}
                  className={cn(
                    "rounded-full border px-2 py-0.5 text-[11px] transition-colors",
                    duration === c.m
                      ? "border-br bg-br-light text-br-deep dark:border-[#5f9d7c] dark:bg-br-light-dark dark:text-[#a7d3ba]"
                      : "border-line text-muted hover:border-br hover:text-br-deep dark:border-line-dark dark:hover:text-[#a7d3ba]"
                  )}
                >
                  {c.label}
                </button>
              ))}
              <input
                type="number"
                min={5}
                step={5}
                value={duration}
                onChange={(e) => {
                  const v = Number(e.target.value);
                  if (v > 0) applyDuration(v);
                }}
                className="input ml-auto w-[86px] shrink-0 py-0.5 text-[11px]"
                aria-label="Duration in minutes"
              />
            </div>
          </div>
        </div>
      ) : (
        <p className="text-[11.5px] text-muted">
          Due at the end of the selected day.
        </p>
      )}

      <div className="flex items-center gap-2 border-t border-line pt-2 dark:border-line-dark">
        <span className={cn("text-[12px]", summary ? "text-br-deep dark:text-[#a7d3ba]" : "text-faint")}>
          {summary ?? "No schedule set"}
        </span>
        <div className="flex-1" />
        <button
          onClick={clearActive}
          className="btn btn-ghost px-2 py-0.5 text-[11px]"
        >
          Clear {mode}
        </button>
      </div>
    </div>
  );
}
