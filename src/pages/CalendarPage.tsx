import { useEffect, useMemo, useRef, useState } from "react";
import { ChevronLeft, ChevronRight, Plus, Trash2 } from "lucide-react";
import { useStore } from "../lib/store";
import type { Event, TaskWithExtras } from "../lib/types";
import {
  DAY_MS,
  MINUTE_MS,
  addDays,
  cn,
  formatTime,
  formatWeekdayShort,
  isSameDay,
  isSameMonth,
  monthMatrix,
  relativeDayLabel,
  startOfDay,
  startOfWeek,
} from "../lib/utils";
import { Modal } from "../components/ui";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../components/ui/select";

type View = "month" | "week" | "day";

const HOUR_TOP = 0;
const HOUR_BOTTOM = 24;
const HOUR_HEIGHT = 52;

interface Chip {
  kind: "task" | "event";
  id: string;
  title: string;
  start: number;
  end: number;
  projectId: string | null;
}

interface DragRecord {
  type: string;
  id: string;
}

function dayKey(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function hourOf(ts: number): number {
  const d = new Date(ts);
  return d.getHours() + d.getMinutes() / 60;
}

function buildChips(tasks: TaskWithExtras[], events: Event[]): Chip[] {
  const out: Chip[] = [];
  for (const t of tasks) {
    if (!t.scheduled_start) continue;
    out.push({
      kind: "task",
      id: t.id,
      title: t.title,
      start: t.scheduled_start,
      end: t.scheduled_end ?? t.scheduled_start + 60 * MINUTE_MS,
      projectId: t.project_id,
    });
  }
  for (const e of events) {
    out.push({
      kind: "event",
      id: e.id,
      title: e.title,
      start: e.start_at,
      end: e.end_at,
      projectId: e.project_id,
    });
  }
  return out.sort((a, b) => a.start - b.start);
}

export default function CalendarPage() {
  const tasks = useStore((s) => s.tasks);
  const events = useStore((s) => s.events);
  const projects = useStore((s) => s.projects);
  const updateTask = useStore((s) => s.updateTask);
  const updateEvent = useStore((s) => s.updateEvent);
  const openTask = useStore((s) => s.openTask);
  const params = useStore((s) => s.params);
  const ui = useStore((s) => s.ui);
  const setUi = useStore((s) => s.setUi);

  const [view, setView] = useState<View>(
    () => ((ui.calendarView as View) ?? "month")
  );
  const [anchor, setAnchor] = useState(
    () => new Date((ui.calendarAnchor as number) ?? startOfDay(new Date()).getTime())
  );
  const [eventModal, setEventModal] = useState<
    { mode: "create"; day: Date } | { mode: "edit"; event: Event } | null
  >(null);
  const [newTaskAt, setNewTaskAt] = useState<number | null>(null);
  const gridRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setUi({ calendarView: view, calendarAnchor: anchor.getTime() });
  }, [view, anchor]); // eslint-disable-line react-hooks/exhaustive-deps

  const today = startOfDay(new Date()).getTime();
  const chips = useMemo(() => buildChips(tasks, events), [tasks, events]);

  const projectColor = (pId: string | null, kind: "task" | "event") => {
    if (kind === "event") return "var(--color-coral)";
    const p = projects.find((x) => x.id === pId);
    return p?.color ?? "var(--color-br)";
  };

  const openChip = (c: Chip) => {
    if (c.kind === "task") openTask(c.id);
    else {
      const ev = events.find((e) => e.id === c.id);
      if (ev) setEventModal({ mode: "edit", event: ev });
    }
  };

  const recordDrag = (e: React.DragEvent, c: Chip) => {
    (window as unknown as { __orbitDrag?: DragRecord }).__orbitDrag = {
      type: c.kind,
      id: c.id,
    };
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData(
      c.kind === "task" ? "text/orbit-task" : "text/orbit-event",
      c.id
    );
  };

  const getDragged = (e: React.DragEvent): DragRecord | null => {
    const recorded = (window as unknown as { __orbitDrag?: DragRecord }).__orbitDrag;
    if (recorded) return recorded;
    const task = e.dataTransfer.getData("text/orbit-task");
    if (task) return { type: "task", id: task };
    const ev = e.dataTransfer.getData("text/orbit-event");
    if (ev) return { type: "event", id: ev };
    return null;
  };

  const moveByDays = (record: DragRecord, targetDay: Date) => {
    if (record.type === "task") {
      const t = tasks.find((x) => x.id === record.id);
      if (!t) return;
      if (t.scheduled_start) {
        const delta = Math.round(
          (targetDay.getTime() - startOfDay(new Date(t.scheduled_start)).getTime()) / DAY_MS
        );
        updateTask(record.id, {
          scheduled_start: t.scheduled_start + delta * DAY_MS,
          scheduled_end: t.scheduled_end ? t.scheduled_end + delta * DAY_MS : null,
        });
      } else {
        updateTask(record.id, {
          scheduled_start: targetDay.getTime() + 12 * 3600000,
          scheduled_end: targetDay.getTime() + 14 * 3600000,
        });
      }
    } else {
      const ev = events.find((e) => e.id === record.id);
      if (!ev) return;
      const delta = Math.round(
        (targetDay.getTime() - startOfDay(new Date(ev.start_at)).getTime()) / DAY_MS
      );
      updateEvent(record.id, {
        start_at: ev.start_at + delta * DAY_MS,
        end_at: ev.end_at + delta * DAY_MS,
      });
    }
  };

  const moveToTime = (record: DragRecord, startMs: number) => {
    if (record.type === "task") {
      const t = tasks.find((x) => x.id === record.id);
      if (!t) return;
      const len = t.scheduled_start && t.scheduled_end
        ? Math.max(t.scheduled_end - t.scheduled_start, 30 * MINUTE_MS)
        : 60 * MINUTE_MS;
      updateTask(record.id, { scheduled_start: startMs, scheduled_end: startMs + len });
    } else {
      const ev = events.find((e) => e.id === record.id);
      if (!ev) return;
      const len = Math.max(ev.end_at - ev.start_at, 30 * MINUTE_MS);
      updateEvent(record.id, { start_at: startMs, end_at: startMs + len });
    }
  };

  const periodLabel = useMemo(() => {
    let base: string;
    if (view === "month")
      base = anchor.toLocaleDateString("en-US", { month: "long", year: "numeric" });
    else if (view === "week") {
      const s = startOfWeek(anchor);
      const e = addDays(s, 6);
      base = `${s.getDate()} – ${e.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}`;
    } else {
      base = anchor.toLocaleDateString("en-US", {
        weekday: "long",
        month: "long",
        day: "numeric",
        year: "numeric",
      });
    }

    let rel = "";
    if (view === "day") {
      rel = relativeDayLabel(anchor);
    } else if (view === "week") {
      const now = startOfWeek(new Date());
      const diff = Math.round(
        (startOfWeek(anchor).getTime() - now.getTime()) / (7 * DAY_MS)
      );
      rel = diff === 0 ? "This week" : diff === 1 ? "Next week" : diff === -1 ? "Last week" : "";
    } else {
      const now = new Date();
      const diff =
        (anchor.getFullYear() - now.getFullYear()) * 12 +
        (anchor.getMonth() - now.getMonth());
      rel = diff === 0 ? "This month" : diff === 1 ? "Next month" : diff === -1 ? "Last month" : "";
    }
    return rel ? `${base} · ${rel}` : base;
  }, [view, anchor]);

  const navigatePeriod = (dir: 1 | -1) => {
    setAnchor((a) => addDays(a, (view === "month" ? 28 : view === "week" ? 7 : 1) * dir));
  };

  const dueTasks = useMemo(
    () =>
      tasks.filter(
        (t) =>
          t.status !== "done" &&
          !t.scheduled_start &&
          t.due_at !== null &&
          isSameDay(new Date(t.due_at), anchor)
      ),
    [tasks, anchor]
  );

  useEffect(() => {
    if (params.eventId) {
      const ev = events.find((e) => e.id === params.eventId);
      if (ev) {
        setAnchor(startOfDay(new Date(ev.start_at)));
        setView("day");
        setEventModal({ mode: "edit", event: ev });
      }
    }
  }, [params.eventId]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="flex h-full flex-col">
      <div className="mx-auto w-full max-w-6xl px-8 pb-3 pt-6">
        <header className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-semibold tracking-tight text-ink dark:text-[#e8efe9]">
              Calendar
            </h1>
            <p className="text-[13px] text-muted">When things happen.</p>
          </div>
          <button
            className="btn btn-primary"
            onClick={() => setEventModal({ mode: "create", day: anchor })}
          >
            <Plus className="h-4 w-4" /> Event
          </button>
        </header>

        <div className="mt-3 flex items-center justify-between">
          <nav className="flex items-center gap-1">
            <button className="btn btn-ghost px-2" onClick={() => navigatePeriod(-1)} aria-label="Previous">
              <ChevronLeft className="h-4 w-4" />
            </button>
            <button className="btn btn-outline" onClick={() => setAnchor(startOfDay(new Date()))}>
              Today
            </button>
            <button className="btn btn-ghost px-2" onClick={() => navigatePeriod(1)} aria-label="Next">
              <ChevronRight className="h-4 w-4" />
            </button>
          </nav>
          <span className="text-[14px] font-medium text-ink dark:text-[#e8efe9]">
            {periodLabel}
          </span>
          <div className="flex gap-1 rounded-lg bg-surface-soft p-1 dark:bg-surface-dark">
            {(["month", "week", "day"] as View[]).map((v) => (
              <button
                key={v}
                onClick={() => setView(v)}
                className={cn(
                  "rounded-md px-3 py-1 text-[12px] font-medium capitalize transition-colors",
                  view === v
                    ? "bg-surface text-ink shadow-sm dark:bg-surface-dark-card dark:text-[#e8efe9]"
                    : "text-muted hover:text-ink dark:hover:text-[#e8efe9]"
                )}
              >
                {v}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="min-h-0 flex-1 px-8 pb-6">
        <div className="mx-auto h-full max-w-6xl">
          {view === "month" && (
            <MonthGrid
              anchor={anchor}
              today={today}
              chips={chips}
              projectColor={projectColor}
              onChipClick={openChip}
              onDrop={(rec, day) => moveByDays(rec, day)}
              onDragStart={recordDrag}
              getDragged={getDragged}
              onDayClick={(d) => {
                setAnchor(startOfDay(d));
                setView("day");
              }}
            />
          )}
          {view === "week" && (
            <WeekGrid
              anchor={anchor}
              today={today}
              chips={chips}
              projectColor={projectColor}
              onChipClick={openChip}
              onDrop={(rec, day) => moveByDays(rec, day)}
              onDragStart={recordDrag}
              getDragged={getDragged}
            />
          )}
          {view === "day" && (
            <DayGrid
              anchor={anchor}
              today={today}
              chips={chips}
              dueTasks={dueTasks}
              projectColor={projectColor}
              onChipClick={openChip}
              onDropAt={moveToTime}
              onDragStart={recordDrag}
              getDragged={getDragged}
              onResize={(rec, start, end) => {
                if (rec.type === "task") {
                  updateTask(rec.id, { scheduled_start: start, scheduled_end: end });
                } else {
                  updateEvent(rec.id, { start_at: start, end_at: end });
                }
              }}
              gridRef={gridRef}
              newTaskAt={newTaskAt}
              onRequestNewTask={(ms) => setNewTaskAt(ms)}
              onCancelNewTask={() => setNewTaskAt(null)}
              onCommitNewTask={async (title, ms) => {
                setNewTaskAt(null);
                if (!title.trim()) return;
                const { createTask } = useStore.getState();
                const id = await createTask({
                  title: title.trim(),
                  scheduled_start: ms,
                  scheduled_end: ms + 60 * MINUTE_MS,
                });
                openTask(id);
              }}
            />
          )}
        </div>
      </div>

      {eventModal && (
        <EventModal
          key={eventModal.mode === "edit" ? eventModal.event.id : "create"}
          mode={eventModal.mode}
          day={eventModal.mode === "create" ? eventModal.day : new Date(eventModal.event.start_at)}
          existing={eventModal.mode === "edit" ? eventModal.event : undefined}
          onClose={() => setEventModal(null)}
        />
      )}
    </div>
  );
}

function MonthGrid({
  anchor,
  today,
  chips,
  projectColor,
  onChipClick,
  onDrop,
  onDragStart,
  getDragged,
  onDayClick,
}: {
  anchor: Date;
  today: number;
  chips: Chip[];
  projectColor: (pid: string | null, kind: "task" | "event") => string;
  onChipClick: (c: Chip) => void;
  onDrop: (rec: DragRecord, day: Date) => void;
  onDragStart: (e: React.DragEvent, c: Chip) => void;
  getDragged: (e: React.DragEvent) => DragRecord | null;
  onDayClick: (d: Date) => void;
}) {
  const weeks = monthMatrix(anchor);
  const chipsByDay = useMemo(() => {
    const m = new Map<string, Chip[]>();
    for (const c of chips) {
      const k = dayKey(new Date(c.start));
      const list = m.get(k) ?? [];
      list.push(c);
      m.set(k, list);
    }
    return m;
  }, [chips]);

  return (
    <div className="grid h-full grid-rows-[auto_1fr] gap-2">
      <div className="grid grid-cols-7">
        {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((d) => (
          <div key={d} className="px-2 pb-1 text-center text-[11px] font-medium uppercase tracking-wider text-faint">
            {d}
          </div>
        ))}
      </div>
      <div className="grid grid-cols-7 grid-rows-6 gap-px overflow-hidden rounded-xl border border-line bg-line dark:border-line-dark dark:bg-line-dark">
        {weeks.flat().map((day) => {
          const k = dayKey(day);
          const items = chipsByDay.get(k) ?? [];
          const inMonth = isSameMonth(day, anchor);
          const isToday = isSameDay(day, new Date(today));
          return (
            <div
              key={k}
              onClick={() => onDayClick(day)}
              onDragOver={(e) => {
                e.preventDefault();
                e.dataTransfer.dropEffect = "move";
              }}
              onDrop={(e) => {
                e.preventDefault();
                const rec = getDragged(e);
                if (rec) onDrop(rec, startOfDay(day));
              }}
              className={cn(
                "bg-surface p-1.5 transition-colors dark:bg-surface-dark-card",
                !inMonth && "opacity-40",
                isToday && "bg-br-light/50 dark:bg-br-light-dark/50"
              )}
            >
              <div
                className={cn(
                  "mb-1 flex h-6 w-6 items-center justify-center rounded-full text-[12px]",
                  isToday ? "bg-br font-semibold text-white" : "text-ink dark:text-[#e8efe9]"
                )}
              >
                {day.getDate()}
              </div>
              <div className="space-y-0.5 overflow-hidden">
                {items.slice(0, 3).map((c) => (
                  <div
                    key={`${c.kind}-${c.id}`}
                    draggable
                    onDragStart={(e) => onDragStart(e, c)}
                    onClick={(e) => {
                      e.stopPropagation();
                      onChipClick(c);
                    }}
                    className="flex cursor-pointer items-center gap-1 rounded-md border-l-2 bg-surface-soft px-1.5 py-0.5 text-[11px] text-ink-soft dark:text-[#cfd9d2]"
                    style={{ borderColor: projectColor(c.projectId, c.kind) }}
                  >
                    <span className="shrink-0 text-[10px] text-faint">{formatTime(c.start)}</span>
                    <span className="truncate">{c.title}</span>
                  </div>
                ))}
                {items.length > 3 && (
                  <div className="px-1.5 text-[10px] text-faint">+{items.length - 3} more</div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function WeekGrid({
  anchor,
  today,
  chips,
  projectColor,
  onChipClick,
  onDrop,
  onDragStart,
  getDragged,
}: {
  anchor: Date;
  today: number;
  chips: Chip[];
  projectColor: (pid: string | null, kind: "task" | "event") => string;
  onChipClick: (c: Chip) => void;
  onDrop: (rec: DragRecord, day: Date) => void;
  onDragStart: (e: React.DragEvent, c: Chip) => void;
  getDragged: (e: React.DragEvent) => DragRecord | null;
}) {
  const weekStart = startOfWeek(anchor);
  const days = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
  const chipsByDay = useMemo(() => {
    const m = new Map<string, Chip[]>();
    for (const c of chips) {
      const k = dayKey(new Date(c.start));
      const list = m.get(k) ?? [];
      list.push(c);
      m.set(k, list);
    }
    return m;
  }, [chips]);

  return (
    <div className="grid h-full grid-rows-[auto_1fr] gap-2">
      <div className="grid grid-cols-7">
        {days.map((d) => {
          const isToday = isSameDay(d, new Date(today));
          return (
            <div key={d.getTime()} className="px-2 pb-1 text-center">
              <div className="text-[11px] font-medium uppercase tracking-wider text-faint">
                {formatWeekdayShort(d)}
              </div>
              <div
                className={cn(
                  "mx-auto mt-0.5 flex h-7 w-7 items-center justify-center rounded-full text-[13px] font-medium",
                  isToday ? "bg-br text-white" : "text-ink dark:text-[#e8efe9]"
                )}
              >
                {d.getDate()}
              </div>
            </div>
          );
        })}
      </div>
      <div className="grid grid-cols-7 gap-2 overflow-hidden">
        {days.map((d) => {
          const k = dayKey(d);
          const items = chipsByDay.get(k) ?? [];
          const isToday = isSameDay(d, new Date(today));
          return (
            <div
              key={k}
              onDragOver={(e) => {
                e.preventDefault();
                e.dataTransfer.dropEffect = "move";
              }}
              onDrop={(e) => {
                e.preventDefault();
                const rec = getDragged(e);
                if (rec) onDrop(rec, startOfDay(d));
              }}
              className={cn(
                "flex min-h-0 flex-col rounded-xl border p-2 transition-colors",
                isToday
                  ? "border-br/50 bg-surface"
                  : "border-line bg-surface dark:border-line-dark dark:bg-surface-dark-card"
              )}
            >
              <div className="min-h-0 flex-1 space-y-1 overflow-y-auto">
                {items.map((c) => (
                  <div
                    key={`${c.kind}-${c.id}`}
                    draggable
                    onDragStart={(e) => onDragStart(e, c)}
                    onClick={() => onChipClick(c)}
                    className="cursor-pointer rounded-md border-l-2 bg-surface-soft px-2 py-1 text-[12px] dark:bg-surface-dark"
                    style={{ borderColor: projectColor(c.projectId, c.kind) }}
                  >
                    <p className="truncate text-ink-soft dark:text-[#cfd9d2]">
                      <span className="mr-1 text-[10px] text-faint">{formatTime(c.start)}</span>
                      {c.title}
                    </p>
                  </div>
                ))}
                {items.length === 0 && (
                  <p className="pt-4 text-center text-[11px] text-faint">—</p>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function DayGrid({
  anchor,
  today,
  chips,
  dueTasks,
  projectColor,
  onChipClick,
  onDropAt,
  onDragStart,
  getDragged,
  onResize,
  gridRef,
  newTaskAt,
  onRequestNewTask,
  onCancelNewTask,
  onCommitNewTask,
}: {
  anchor: Date;
  today: number;
  chips: Chip[];
  dueTasks: TaskWithExtras[];
  projectColor: (pid: string | null, kind: "task" | "event") => string;
  onChipClick: (c: Chip) => void;
  onDropAt: (rec: DragRecord, ms: number) => void;
  onDragStart: (e: React.DragEvent, c: Chip) => void;
  getDragged: (e: React.DragEvent) => DragRecord | null;
  onResize: (rec: { type: "task" | "event"; id: string }, start: number, end: number) => void;
  gridRef: React.RefObject<HTMLDivElement>;
  newTaskAt: number | null;
  onRequestNewTask: (ms: number) => void;
  onCancelNewTask: () => void;
  onCommitNewTask: (title: string, ms: number) => void;
}) {
  const [draft, setDraft] = useState("");
  const [scrollTop, setScrollTop] = useState(0);
  const hours = Array.from({ length: HOUR_BOTTOM - HOUR_TOP }, (_, i) => HOUR_TOP + i);
  const contentHeight = (HOUR_BOTTOM - HOUR_TOP) * HOUR_HEIGHT;

  const scrollRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const gutterRef = useRef<HTMLDivElement>(null);
  const previewRef = useRef<{ id: string; start: number; end: number } | null>(null);
  const suppressClickRef = useRef(false);
  const dragOffsetRef = useRef(0);

  const [resize, setResize] = useState<{
    id: string;
    kind: "task" | "event";
    edge: "top" | "bottom";
    origStart: number;
    origEnd: number;
    clientY: number;
  } | null>(null);
  const [preview, setPreview] = useState<{ id: string; start: number; end: number } | null>(null);

  const isToday = isSameDay(anchor, new Date(today));
  const dayStart = anchor.getTime();
  const dayEnd = dayStart + DAY_MS - 1;

  const snap5 = (ms: number): number =>
    Math.round(ms / (5 * MINUTE_MS)) * 5 * MINUTE_MS;

  const clientToTime = (clientY: number, offsetMs = 0): number => {
    const scrollEl = scrollRef.current;
    const rect = contentRef.current?.getBoundingClientRect();
    if (!scrollEl || !rect) return anchor.getTime() + 9 * 3600000;
    const ms = ((clientY - rect.top + scrollEl.scrollTop) / HOUR_HEIGHT) * 3600000 - offsetMs;
    const snapped = Math.round(ms / (5 * MINUTE_MS)) * 5 * MINUTE_MS;
    return anchor.getTime() + snapped;
  };

  const startResize = (
    e: React.PointerEvent,
    chip: Chip,
    edge: "top" | "bottom"
  ) => {
    e.stopPropagation();
    e.preventDefault();
    suppressClickRef.current = true;
    previewRef.current = { id: chip.id, start: chip.start, end: chip.end };
    setPreview(previewRef.current);
    setResize({
      id: chip.id,
      kind: chip.kind,
      edge,
      origStart: chip.start,
      origEnd: chip.end,
      clientY: e.clientY,
    });
  };

  useEffect(() => {
    if (!resize) return;
    const onMove = (e: PointerEvent) => {
      const diff = ((e.clientY - resize.clientY) / HOUR_HEIGHT) * 3600000;
      let next: { id: string; start: number; end: number };
      if (resize.edge === "top") {
        const start = snap5(resize.origStart + diff);
        const maxStart = resize.origEnd - 30 * MINUTE_MS;
        next = { id: resize.id, start: Math.min(start, maxStart), end: resize.origEnd };
      } else {
        const end = snap5(resize.origEnd + diff);
        const minEnd = resize.origStart + 30 * MINUTE_MS;
        next = { id: resize.id, start: resize.origStart, end: Math.max(end, minEnd) };
      }
      previewRef.current = next;
      setPreview(next);
    };
    const onUp = () => {
      const p = previewRef.current;
      setResize(null);
      setPreview(null);
      previewRef.current = null;
      if (p) onResize({ type: resize.kind, id: resize.id }, p.start, p.end);
      setTimeout(() => {
        suppressClickRef.current = false;
      }, 0);
    };
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
    };
  }, [resize]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const targetHour = isToday ? Math.max(hourOf(Date.now()), 6) : 8;
    el.scrollTop = Math.max(0, targetHour * HOUR_HEIGHT - 40);
  }, [anchor]); // eslint-disable-line react-hooks/exhaustive-deps

  const sched = chips
    .filter((c) => c.start >= dayStart && c.start <= dayEnd)
    .map((c) => {
      const use = preview && preview.id === c.id ? preview : null;
      const start = use ? use.start : c.start;
      const end = use ? use.end : c.end;
      return {
        chip: c,
        top: (hourOf(start) - HOUR_TOP) * HOUR_HEIGHT,
        height: Math.max(((end - start) / 3600000) * HOUR_HEIGHT, 24),
      };
    });

  return (
    <div className="flex h-full flex-col gap-2">
      {dueTasks.length > 0 && (
        <div className="rounded-xl border border-line bg-surface px-3 py-2 dark:border-line-dark dark:bg-surface-dark-card">
          <span className="text-[11px] font-medium uppercase tracking-wider text-faint">Due today</span>
          <div className="mt-1 flex flex-wrap gap-2">
            {dueTasks.map((t) => (
              <span key={t.id} className="chip border border-line text-muted dark:border-line-dark">
                {t.title}
              </span>
            ))}
          </div>
        </div>
      )}
      <div
        ref={gridRef}
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => {
          e.preventDefault();
          const rec = getDragged(e);
          if (rec) onDropAt(rec, clientToTime(e.clientY, dragOffsetRef.current));
        }}
        onDoubleClick={(e) => onRequestNewTask(clientToTime(e.clientY))}
        className="relative flex-1 overflow-hidden rounded-xl border border-line bg-surface dark:border-line-dark dark:bg-surface-dark-card"
      >
        <div className="flex h-full">
          <div ref={gutterRef} className="relative w-12 shrink-0 overflow-hidden">
            <div
              className="absolute inset-x-0 top-0"
              style={{ height: contentHeight, transform: `translateY(-${scrollTop}px)` }}
            >
              {hours.map((h) => (
                <div
                  key={h}
                  className="absolute right-2 -translate-y-1/2 text-[9px] tabular-nums text-faint"
                  style={{ top: (h - HOUR_TOP) * HOUR_HEIGHT + HOUR_HEIGHT / 2 }}
                >
                  {h === 0 ? "12 AM" : h < 12 ? `${h} AM` : h === 12 ? "12 PM" : `${h - 12} PM`}
                </div>
              ))}
            </div>
          </div>
          <div
            ref={scrollRef}
            onScroll={(e) => setScrollTop(e.currentTarget.scrollTop)}
            className="relative flex-1 overflow-y-auto"
          >
            <div ref={contentRef} className="relative" style={{ height: contentHeight }}>
              {hours.map((h) => (
                <div
                  key={h}
                  className="absolute inset-x-0 border-t border-line/70 dark:border-line-dark/70"
                  style={{ top: (h - HOUR_TOP) * HOUR_HEIGHT, height: HOUR_HEIGHT }}
                />
              ))}
              {isToday && (
                <div
                  className="absolute inset-x-0 z-10 border-t-2 border-coral/70"
                  style={{ top: (hourOf(Date.now()) - HOUR_TOP) * HOUR_HEIGHT }}
                >
                  <div className="absolute -left-1.5 -top-1 h-2 w-2 rounded-full bg-coral" />
                </div>
              )}
              {sched.map(({ chip, top, height }) => (
                <div
                  key={`${chip.kind}-${chip.id}`}
                  draggable
                  onDragStart={(e) => {
                    const contentEl = contentRef.current;
                    const scrollEl = scrollRef.current;
                    if (contentEl && scrollEl) {
                      const rect = contentEl.getBoundingClientRect();
                      const pointerContentY = e.clientY - rect.top + scrollEl.scrollTop;
                      const chipTop = (hourOf(chip.start) - HOUR_TOP) * HOUR_HEIGHT;
                      dragOffsetRef.current =
                        ((pointerContentY - chipTop) / HOUR_HEIGHT) * 3600000;
                    }
                    onDragStart(e, chip);
                  }}
                  onClick={() => {
                    if (suppressClickRef.current) return;
                    onChipClick(chip);
                  }}
                  className="group absolute cursor-pointer overflow-hidden rounded-md border-l-[3px] px-2 py-1 text-[11.5px] leading-tight shadow-sm"
                  style={{
                    top,
                    height,
                    left: 6,
                    right: 6,
                    borderColor: projectColor(chip.projectId, chip.kind),
                    background: `color-mix(in srgb, ${projectColor(chip.projectId, chip.kind)} 14%, transparent)`,
                  }}
                >
                  <p className="truncate font-medium text-ink dark:text-[#e8efe9]">
                    {formatTime(chip.start)} · {chip.title}
                  </p>
                  <div
                    onPointerDown={(e) => startResize(e, chip, "top")}
                    title="Drag to change start time"
                    className="absolute inset-x-0 top-0 z-10 h-2 cursor-ns-resize touch-none opacity-0 transition-opacity group-hover:opacity-100"
                  />
                  <div
                    onPointerDown={(e) => startResize(e, chip, "bottom")}
                    title="Drag to change end time"
                    className="absolute inset-x-0 bottom-0 z-10 h-2 cursor-ns-resize touch-none opacity-0 transition-opacity group-hover:opacity-100"
                  />
                </div>
              ))}
              {newTaskAt !== null && (
                <div
                  className="absolute z-20 px-2"
                  style={{
                    top: (hourOf(newTaskAt) - HOUR_TOP) * HOUR_HEIGHT,
                    left: 8,
                    right: 8,
                  }}
                >
                  <input
                    autoFocus
                    value={draft}
                    onChange={(e) => setDraft(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") onCommitNewTask(draft, newTaskAt);
                      if (e.key === "Escape") {
                        setDraft("");
                        onCancelNewTask();
                      }
                    }}
                    onBlur={() => {
                      setDraft("");
                      onCancelNewTask();
                    }}
                    placeholder={`New task · ${formatTime(newTaskAt)}`}
                    className="input rounded-md border-2 border-br px-2 py-1 text-[12.5px] shadow-md"
                  />
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function toLocal(ts: number): string {
  const d = new Date(ts);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function EventModal({
  mode,
  day,
  existing,
  onClose,
}: {
  mode: "create" | "edit";
  day: Date;
  existing?: Event;
  onClose: () => void;
}) {
  const projects = useStore((s) => s.projects);
  const createEvent = useStore((s) => s.createEvent);
  const updateEvent = useStore((s) => s.updateEvent);
  const deleteEvent = useStore((s) => s.deleteEvent);
  const toast = useStore((s) => s.toast);

  const [title, setTitle] = useState(existing?.title ?? "");
  const [desc, setDesc] = useState(existing?.description ?? "");
  const [projectId, setProjectId] = useState(existing?.project_id ?? null);
  const [startVal, setStartVal] = useState(
    existing ? toLocal(existing.start_at) : toLocal(day.getTime() + 9 * 3600000)
  );
  const [endVal, setEndVal] = useState(
    existing ? toLocal(existing.end_at) : toLocal(day.getTime() + 10 * 3600000)
  );

  const save = async () => {
    const t = title.trim();
    if (!t) return;
    const start_at = new Date(startVal).getTime();
    let end_at = new Date(endVal).getTime();
    if (end_at <= start_at) end_at = start_at + 3600000;
    if (mode === "create") {
      await createEvent({ title: t, start_at, end_at, project_id: projectId });
      toast("Event added", "success");
    } else if (existing) {
      await updateEvent(existing.id, { title: t, description: desc, start_at, end_at, project_id: projectId });
      toast("Event updated", "success");
    }
    onClose();
  };

  return (
    <Modal open onClose={onClose} title={mode === "create" ? "New event" : "Edit event"}>
      <div className="space-y-3">
        <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Event title" className="input" autoFocus />
        <div className="grid grid-cols-2 gap-3">
          <label className="block">
            <span className="mb-1 block text-[11px] font-medium uppercase tracking-wider text-faint">Starts</span>
            <input type="datetime-local" value={startVal} onChange={(e) => setStartVal(e.target.value)} className="input" />
          </label>
          <label className="block">
            <span className="mb-1 block text-[11px] font-medium uppercase tracking-wider text-faint">Ends</span>
            <input type="datetime-local" value={endVal} onChange={(e) => setEndVal(e.target.value)} className="input" />
          </label>
        </div>
        <label className="block">
          <span className="mb-1 block text-[11px] font-medium uppercase tracking-wider text-faint">Project</span>
          <Select
            value={projectId ?? "none"}
            onValueChange={(v) => setProjectId(v === "none" ? null : v)}
          >
            <SelectTrigger>
              <SelectValue placeholder="Project" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">None</SelectItem>
              {projects.map((p) => (
                <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </label>
        <label className="block">
          <span className="mb-1 block text-[11px] font-medium uppercase tracking-wider text-faint">Description</span>
          <textarea value={desc} onChange={(e) => setDesc(e.target.value)} rows={2} placeholder="Optional…" className="input resize-none" />
        </label>
        <div className="flex items-center justify-between pt-1">
          {mode === "edit" && existing && (
            <button
              className="btn btn-danger-ghost"
              onClick={() => {
                deleteEvent(existing.id);
                toast("Event deleted", "info");
                onClose();
              }}
            >
              <Trash2 className="h-4 w-4" /> Delete
            </button>
          )}
          <div className="ml-auto flex gap-2">
            <button className="btn btn-outline" onClick={onClose}>Cancel</button>
            <button className="btn btn-primary" onClick={save}>Save</button>
          </div>
        </div>
      </div>
    </Modal>
  );
}