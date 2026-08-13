import { useMemo, useState } from "react";
import { ArrowLeft, CalendarClock, FolderKanban, NotebookPen } from "lucide-react";
import { useStore } from "../lib/store";
import { cn, formatShort, relativeTime } from "../lib/utils";
import { EmptyState, ProgressBar } from "../components/ui";
import TaskItem from "../components/TaskItem";
import KanbanBoard from "../components/KanbanBoard";
import QuickAdd from "../components/QuickAdd";

type Tab = "overview" | "tasks" | "notes" | "kanban";

export default function ProjectPage({ id }: { id: string }) {
  const project = useStore((s) => s.projects.find((p) => p.id === id));
  const allTasks = useStore((s) => s.tasks);
  const allNotes = useStore((s) => s.notes);
  const allEvents = useStore((s) => s.events);
  const navigate = useStore((s) => s.navigate);
  const updateTask = useStore((s) => s.updateTask);

  const [tab, setTab] = useState<Tab>("overview");

  const tasks = useMemo(
    () => allTasks.filter((t) => t.project_id === id),
    [allTasks, id]
  );
  const notes = useMemo(
    () => allNotes.filter((n) => n.project_id === id),
    [allNotes, id]
  );
  const events = useMemo(
    () => allEvents.filter((e) => e.project_id === id),
    [allEvents, id]
  );

  const stats = useMemo(() => {
    const done = tasks.filter((t) => t.status === "done").length;
    const inProgress = tasks.filter((t) => t.status === "in_progress").length;
    const todo = tasks.filter((t) => t.status === "todo").length;
    const blocked = tasks.filter((t) => t.status === "blocked").length;
    return {
      total: tasks.length,
      done,
      inProgress,
      todo,
      blocked,
      pct: tasks.length === 0 ? 0 : Math.round((done / tasks.length) * 100),
    };
  }, [tasks]);

  if (!project) {
    return (
      <div className="flex h-full items-center justify-center">
        <EmptyState title="Project not found" hint="It may have been deleted." />
      </div>
    );
  }

  const upcoming = tasks
    .filter((t) => {
      if (t.status === "done") return false;
      const ref = t.scheduled_start ?? t.due_at;
      return ref !== null && ref > Date.now() && ref < Date.now() + 7 * 86400000;
    })
    .sort((a, b) => (a.scheduled_start ?? a.due_at ?? 0) - (b.scheduled_start ?? b.due_at ?? 0))
    .slice(0, 5);

  const TABS: Array<{ id: Tab; label: string }> = [
    { id: "overview", label: "Overview" },
    { id: "tasks", label: "Tasks" },
    { id: "notes", label: "Notes" },
    { id: "kanban", label: "Kanban" },
  ];

  return (
    <div className="h-full overflow-y-auto">
      <div className="mx-auto max-w-4xl px-8 py-6">
        <button
          onClick={() => navigate("projects", {})}
          className="mb-3 flex items-center gap-1 text-[12px] text-muted transition-colors hover:text-br-deep dark:hover:text-[#a7d3ba]"
        >
          <ArrowLeft className="h-3.5 w-3.5" /> All projects
        </button>

        <header className="mb-4">
          <div className="flex items-center gap-3">
            <span
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-white"
              style={{ background: project.color ?? "var(--color-br)" }}
            >
              <FolderKanban className="h-5 w-5" />
            </span>
            <div className="min-w-0">
              <h1 className="text-xl font-semibold tracking-tight text-ink dark:text-[#e8efe9]">
                {project.name}
              </h1>
              {project.description && (
                <p className="truncate text-[13px] text-muted">{project.description}</p>
              )}
            </div>
          </div>
          <div className="mt-3 flex items-center gap-3">
            <ProgressBar value={stats.pct} className="max-w-xs" />
            <span className="text-[13px] font-medium text-br-deep dark:text-[#a7d3ba]">
              {stats.pct}%
            </span>
          </div>
        </header>

        <div className="mb-4 flex items-center gap-1 border-b border-line dark:border-line-dark">
          {TABS.map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={cn(
                "-mb-px border-b-2 px-3 py-2 text-[13px] capitalize transition-colors",
                tab === t.id
                  ? "border-br font-medium text-br-deep dark:text-[#a7d3ba]"
                  : "border-transparent text-muted hover:text-ink dark:hover:text-[#e8efe9]"
              )}
            >
              {t.label}
            </button>
          ))}
        </div>

        {tab === "overview" && (
          <div className="space-y-6">
            <div className="grid grid-cols-4 gap-3">
              {[
                { value: stats.total, label: "Total tasks" },
                { value: stats.done, label: "Completed" },
                { value: stats.inProgress, label: "In progress" },
                { value: stats.todo + stats.blocked, label: "Remaining" },
              ].map((s) => (
                <div
                  key={s.label}
                  className="rounded-xl border border-line bg-surface px-4 py-3 dark:border-line-dark dark:bg-surface-dark-card"
                >
                  <p className="text-[16px] font-medium text-ink dark:text-[#e8efe9]">{s.value}</p>
                  <p className="text-[11px] text-muted">{s.label}</p>
                </div>
              ))}
            </div>

            <section>
              <h2 className="mb-2 text-[13px] font-medium text-ink dark:text-[#e8efe9]">Tasks</h2>
              {tasks.length === 0 ? (
                <p className="text-[12px] text-faint">No tasks in this project yet.</p>
              ) : (
                <div className="divide-y divide-line rounded-xl border border-line bg-surface px-2 py-1 dark:divide-line-dark dark:border-line-dark dark:bg-surface-dark-card">
                  {tasks.slice(0, 6).map((t) => (
                    <TaskItem
                      key={t.id}
                      task={t}
                      project={project}
                      onToggle={() =>
                        updateTask(t.id, { status: t.status === "done" ? "todo" : "done" })
                      }
                      onOpen={() => navigate("tasks", { taskId: t.id })}
                    />
                  ))}
                  {tasks.length > 6 && (
                    <button
                      onClick={() => setTab("tasks")}
                      className="w-full py-2 text-center text-[12px] text-br hover:underline"
                    >
                      View all {tasks.length} tasks →
                    </button>
                  )}
                </div>
              )}
            </section>

            <section>
              <h2 className="mb-2 text-[13px] font-medium text-ink dark:text-[#e8efe9]">Upcoming</h2>
              {upcoming.length === 0 ? (
                <p className="text-[12px] text-faint">Nothing scheduled in the next 7 days.</p>
              ) : (
                <div className="divide-y divide-line rounded-xl border border-line bg-surface px-2 py-1 dark:divide-line-dark dark:border-line-dark dark:bg-surface-dark-card">
                  {upcoming.map((t) => (
                    <div
                      key={t.id}
                      className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-2 text-[12.5px] text-ink-soft transition-colors hover:bg-surface-soft dark:text-[#cfd9d2] dark:hover:bg-surface-dark"
                      onClick={() => navigate("tasks", { taskId: t.id })}
                    >
                      <CalendarClock className="h-3.5 w-3.5 shrink-0 text-br" />
                      <span className="truncate">{t.title}</span>
                      <span className="ml-auto shrink-0 text-[11px] text-faint">
                        {formatShort(new Date(t.scheduled_start ?? t.due_at ?? 0))}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </section>

            <section>
              <h2 className="mb-2 text-[13px] font-medium text-ink dark:text-[#e8efe9]">Notes</h2>
              {notes.length === 0 ? (
                <p className="text-[12px] text-faint">No notes yet.</p>
              ) : (
                <div className="divide-y divide-line rounded-xl border border-line bg-surface px-2 py-1 dark:divide-line-dark dark:border-line-dark dark:bg-surface-dark-card">
                  {notes.slice(0, 4).map((n) => (
                    <button
                      key={n.id}
                      onClick={() => navigate("notes", { noteId: n.id })}
                      className="flex w-full items-center gap-2 rounded-md px-2 py-2 text-left transition-colors hover:bg-surface-soft dark:hover:bg-surface-dark"
                    >
                      <NotebookPen className="h-3.5 w-3.5 shrink-0 text-br" />
                      <span className="truncate text-[13px] text-ink dark:text-[#e8efe9]">
                        {n.title || "Untitled"}
                      </span>
                      <span className="ml-auto shrink-0 text-[11px] text-faint">
                        {relativeTime(n.updated_at)}
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </section>
          </div>
        )}

        {tab === "tasks" && (
          <div className="space-y-3">
            <QuickAdd defaultProjectId={project.id} />
            {tasks.length === 0 ? (
              <EmptyState title="No tasks yet" hint="Add your first task above." />
            ) : (
              <div className="divide-y divide-line rounded-xl border border-line bg-surface px-2 py-1 dark:divide-line-dark dark:border-line-dark dark:bg-surface-dark-card">
                {tasks
                  .slice()
                  .sort((a, b) => (a.scheduled_start ?? a.due_at ?? 0) - (b.scheduled_start ?? b.due_at ?? 0))
                  .map((t) => (
                    <TaskItem
                      key={t.id}
                      task={t}
                      project={project}
                      onToggle={() =>
                        updateTask(t.id, { status: t.status === "done" ? "todo" : "done" })
                      }
                      onOpen={() => navigate("tasks", { taskId: t.id })}
                    />
                  ))}
              </div>
            )}
          </div>
        )}

        {tab === "notes" && (
          <div className="space-y-1">
            {notes.length === 0 ? (
              <EmptyState
                icon={<NotebookPen className="h-5 w-5" />}
                title="No notes"
                hint="Notes can be created and linked to this project."
              />
            ) : (
              notes.map((n) => (
                <button
                  key={n.id}
                  onClick={() => navigate("notes", { noteId: n.id })}
                  className="flex w-full items-center gap-2 rounded-lg border border-line bg-surface px-3 py-2.5 text-left transition-colors hover:border-br/50 dark:border-line-dark dark:bg-surface-dark-card"
                >
                  <NotebookPen className="h-4 w-4 shrink-0 text-br" />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[13.5px] font-medium text-ink dark:text-[#e8efe9]">
                      {n.title || "Untitled"}
                    </span>
                    <span className="block truncate text-[12px] text-muted">
                      {n.content.replace(/[#*`>_-]/g, "").trim().slice(0, 80) || "Empty note"}
                    </span>
                  </span>
                  <span className="shrink-0 text-[11px] text-faint">
                    {relativeTime(n.updated_at)}
                  </span>
                </button>
              ))
            )}
            {events.length > 0 && (
              <section>
                <h2 className="mb-2 mt-5 text-[13px] font-medium text-ink dark:text-[#e8efe9]">Events</h2>
                {events.map((e) => (
                  <div key={e.id} className="flex items-center gap-2 rounded-lg border border-line bg-surface px-3 py-2 text-[12.5px] text-ink-soft dark:border-line-dark dark:bg-surface-dark-card dark:text-[#cfd9d2]">
                    <CalendarClock className="h-3.5 w-3.5 text-coral" />
                    <span className="truncate">{e.title}</span>
                    <span className="ml-auto text-[11px] text-faint">
                      {formatShort(new Date(e.start_at))} · {new Date(e.start_at).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}
                    </span>
                  </div>
                ))}
              </section>
            )}
          </div>
        )}

        {tab === "kanban" && (
          <div className="h-[calc(100vh-260px)] min-h-[420px]">
            <KanbanBoard projectId={project.id} />
          </div>
        )}
      </div>
    </div>
  );
}