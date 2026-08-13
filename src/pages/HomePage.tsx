import { useMemo } from "react";
import { Calendar, ListTodo } from "lucide-react";
import { useStore } from "../lib/store";
import {
  DAY_MS,
  cn,
  formatShort,
  formatTime,
  isSameDay,
  startOfDay,
  startOfWeek,
} from "../lib/utils";
import { EmptyState, ProgressBar } from "../components/ui";
import TaskItem from "../components/TaskItem";

export default function HomePage() {
  const tasks = useStore((s) => s.tasks);
  const projects = useStore((s) => s.projects);
  const events = useStore((s) => s.events);
  const navigate = useStore((s) => s.navigate);
  const updateTask = useStore((s) => s.updateTask);

  const projectOf = useMemo(() => {
    const m = new Map<string, (typeof projects)[number]>();
    for (const p of projects) m.set(p.id, p);
    return m;
  }, [projects]);

  const hour = new Date().getHours();
  const greeting =
    hour < 5 ? "Good night" : hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";

  const total = tasks.length;
  const done = tasks.filter((t) => t.status === "done").length;
  const remaining = total - done;
  const rate = total === 0 ? 0 : Math.round((done / total) * 100);

  const weekStart = startOfWeek(new Date()).getTime();
  const weekBars = useMemo(() => {
    const labels = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
    return labels.map((label, i) => {
      const dayStart = weekStart + i * DAY_MS;
      const dayEnd = dayStart + DAY_MS - 1;
      const dayTasks = tasks.filter(
        (t) =>
          t.scheduled_start !== null &&
          t.scheduled_start >= dayStart &&
          t.scheduled_start <= dayEnd
      );
      const d = dayTasks.filter((t) => t.status === "done").length;
      const max = Math.max(dayTasks.length, 1);
      return { label, done: d, total: dayTasks.length, pct: (d / max) * 100 };
    });
  }, [tasks, weekStart]);

  const projectRows = useMemo(
    () =>
      projects
        .filter((p) => p.status === "active")
        .map((p) => {
          const pts = tasks.filter((t) => t.project_id === p.id);
          const d = pts.filter((t) => t.status === "done").length;
          const pct = pts.length === 0 ? 0 : Math.round((d / pts.length) * 100);
          return { project: p, total: pts.length, done: d, pct };
        })
        .filter((r) => r.total > 0)
        .sort((a, b) => b.pct - a.pct)
        .slice(0, 5),
    [projects, tasks]
  );

  const upcomingTasks = useMemo(() => {
    const now = Date.now();
    const horizon = now + 7 * DAY_MS;
    return tasks
      .filter(
        (t) =>
          t.status !== "done" &&
          t.scheduled_start !== null &&
          t.scheduled_start > now &&
          t.scheduled_start < horizon
      )
      .sort((a, b) => (a.scheduled_start ?? 0) - (b.scheduled_start ?? 0))
      .slice(0, 5);
  }, [tasks]);

  const upcomingEvents = useMemo(() => {
    const now = Date.now();
    const horizon = now + 7 * DAY_MS;
    return events
      .filter((e) => e.start_at > now && e.start_at < horizon)
      .sort((a, b) => a.start_at - b.start_at)
      .slice(0, 5);
  }, [events]);

  return (
    <div className="h-full overflow-y-auto">
      <div className="mx-auto max-w-3xl px-8 py-6">
        <header className="mb-5">
          <h1 className="text-xl font-semibold tracking-tight text-ink dark:text-[#e8efe9]">
            {greeting}
          </h1>
          <p className="text-[13px] text-muted">
            {new Date().toLocaleDateString("en-US", {
              weekday: "long",
              month: "long",
              day: "numeric",
            })}
          </p>
        </header>

        <div className="grid grid-cols-3 gap-3">
          {[
            { value: done, label: "Completed" },
            { value: remaining, label: "Remaining" },
            { value: `${rate}%`, label: "Completion" },
          ].map((s) => (
            <div
              key={s.label}
              className="rounded-xl border border-line bg-surface px-4 py-3 dark:border-line-dark dark:bg-surface-dark-card"
            >
              <p className="text-[13px] font-medium text-ink dark:text-[#e8efe9]">
                {s.value}
              </p>
              <p className="text-[11px] text-muted">{s.label}</p>
            </div>
          ))}
        </div>

        <section className="mt-6">
          <div className="mb-2 flex items-baseline justify-between">
            <h2 className="text-[13px] font-medium text-ink dark:text-[#e8efe9]">
              This Week
            </h2>
            <span className="text-[11px] text-faint">
              Tasks completed by day
            </span>
          </div>
          <div className="rounded-xl border border-line bg-surface px-4 py-4 dark:border-line-dark dark:bg-surface-dark-card">
            {weekBars.map((b) => (
              <div key={b.label} className="flex items-center gap-3 py-[3px]">
                <span className="w-8 text-[11px] text-muted">{b.label}</span>
                <div className="h-3 flex-1 rounded-sm bg-surface-soft dark:bg-surface-dark">
                  <div
                    className={cn(
                      "h-full rounded-sm transition-[width] duration-300",
                      b.total === 0 ? "bg-br/25" : "bg-br"
                    )}
                    style={{ width: `${Math.max(b.pct, b.done > 0 ? 8 : 0)}%` }}
                  />
                </div>
                <span className="w-6 text-right text-[11px] text-faint">
                  {b.done}
                </span>
              </div>
            ))}
          </div>
        </section>

        <div className="mt-6 grid grid-cols-1 gap-6 sm:grid-cols-2">
          <section>
            <h2 className="mb-2 text-[13px] font-medium text-ink dark:text-[#e8efe9]">
              Active Projects
            </h2>
            {projectRows.length === 0 ? (
              <p className="text-[12px] text-faint">
                No projects with tasks yet.
              </p>
            ) : (
              <div className="space-y-3">
                {projectRows.map((r) => (
                  <button
                    key={r.project.id}
                    onClick={() => navigate("project", { projectId: r.project.id })}
                    className="block w-full text-left"
                  >
                    <div className="mb-1 flex items-center justify-between gap-2">
                      <span className="flex items-center gap-2 text-[12.5px] text-ink dark:text-[#e8efe9]">
                        <span
                          className="h-2 w-2 shrink-0 rounded-full"
                          style={{ background: r.project.color ?? "var(--color-br)" }}
                        />
                        <span className="truncate">{r.project.name}</span>
                      </span>
                      <span className="shrink-0 text-[11px] text-muted">
                        {r.pct}%
                      </span>
                    </div>
                    <ProgressBar value={r.pct} />
                  </button>
                ))}
              </div>
            )}
          </section>

          <section>
            <h2 className="mb-2 text-[13px] font-medium text-ink dark:text-[#e8efe9]">
              Upcoming
            </h2>
            {upcomingTasks.length === 0 && upcomingEvents.length === 0 ? (
              <p className="text-[12px] text-faint">Nothing upcoming this week.</p>
            ) : (
              <div className="space-y-1">
                {upcomingTasks.map((t) => (
                  <div
                    key={t.id}
                    className="flex items-center gap-2 rounded-md px-2 py-1.5 text-[12.5px] text-ink-soft transition-colors hover:bg-surface-soft dark:text-[#cfd9d2] dark:hover:bg-surface-dark"
                  >
                    <ListTodo className="h-3.5 w-3.5 shrink-0 text-br" />
                    <span className="truncate">{t.title}</span>
                    <span className="ml-auto shrink-0 text-[11px] text-faint">
                      {formatShort(new Date(t.scheduled_start ?? 0))}
                    </span>
                  </div>
                ))}
                {upcomingEvents.map((e) => (
                  <div
                    key={e.id}
                    className="flex items-center gap-2 rounded-md px-2 py-1.5 text-[12.5px] text-ink-soft transition-colors hover:bg-surface-soft dark:text-[#cfd9d2] dark:hover:bg-surface-dark"
                  >
                    <Calendar className="h-3.5 w-3.5 shrink-0 text-coral" />
                    <span className="truncate">{e.title}</span>
                    <span className="ml-auto shrink-0 text-[11px] text-faint">
                      {formatShort(new Date(e.start_at))} · {formatTime(e.start_at)}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>

        <section className="mt-6">
          <div className="mb-2 flex items-center justify-between">
            <h2 className="text-[13px] font-medium text-ink dark:text-[#e8efe9]">
              Today
            </h2>
            <button
              onClick={() => navigate("tasks", {})}
              className="text-[11px] text-br hover:underline"
            >
              View all →
            </button>
          </div>
          {(() => {
            const todayTs = startOfDay(new Date()).getTime();
            const todays = tasks
              .filter((t) => {
                if (t.status === "done") return false;
                const sd = t.scheduled_start !== null && isSameDay(new Date(t.scheduled_start), new Date(todayTs));
                const dd = t.due_at !== null && isSameDay(new Date(t.due_at), new Date(todayTs));
                const ov = t.due_at !== null && t.due_at < Date.now();
                return sd || dd || ov;
              })
              .sort((a, b) => (a.scheduled_start ?? a.due_at ?? 0) - (b.scheduled_start ?? b.due_at ?? 0))
              .slice(0, 5);
            return todays.length === 0 ? (
              <EmptyState
                title="Nothing for today"
                hint="Enjoy the space — or schedule something below."
              />
            ) : (
              todays.map((t) => (
                <TaskItem
                  key={t.id}
                  task={t}
                  project={projectOf.get(t.project_id ?? "") ?? null}
                  onToggle={() =>
                    updateTask(t.id, { status: t.status === "done" ? "todo" : "done" })
                  }
                  onOpen={() => navigate("tasks", { taskId: t.id })}
                />
              ))
            );
          })()}
        </section>
      </div>
    </div>
  );
}
