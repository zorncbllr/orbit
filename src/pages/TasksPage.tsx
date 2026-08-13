import { useEffect, useMemo, useState } from "react";
import { ArrowDownUp, Filter, ListTodo } from "lucide-react";
import { useStore, type TaskWithExtras } from "../lib/store";
import {
  PRIORITY_LABELS,
  STATUS_LABELS,
  cn,
  isOverdue,
  isSameDay,
  startOfDay,
  startOfWeek,
} from "../lib/utils";
import type { Priority, TaskStatus } from "../lib/types";
import TaskItem from "../components/TaskItem";
import QuickAdd from "../components/QuickAdd";
import { EmptyState } from "../components/ui";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../components/ui/select";

type Tab = "today" | "week" | "month" | "all";

const TABS: Array<{ id: Tab; label: string }> = [
  { id: "today", label: "Today" },
  { id: "week", label: "This Week" },
  { id: "month", label: "This Month" },
  { id: "all", label: "All" },
];

function taskDayKey(ts: number | null): string | null {
  return ts ? startOfDay(new Date(ts)).toISOString().slice(0, 10) : null;
}

export default function TasksPage() {
  const tasks = useStore((s) => s.tasks);
  const projects = useStore((s) => s.projects);
  const openTask = useStore((s) => s.openTask);
  const updateTask = useStore((s) => s.updateTask);
  const ui = useStore((s) => s.ui);
  const setUi = useStore((s) => s.setUi);

  const [tab, setTab] = useState<Tab>(() => (ui.tasksTab as Tab) ?? "today");
  const [search, setSearch] = useState(
    () => (ui.tasksSearch as string) ?? ""
  );
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [fStatus, setFStatus] = useState<"" | TaskStatus>(
    () => ((ui.tasksStatus as "" | TaskStatus) ?? "")
  );
  const [fPriority, setFPriority] = useState<"" | Priority>(
    () => ((ui.tasksPriority as "" | Priority) ?? "")
  );
  const [fProject, setFProject] = useState(
    () => (ui.tasksProject as string) ?? ""
  );
  const [sortBy, setSortBy] = useState<"due" | "created" | "priority" | "title">(
    () => ((ui.tasksSort as "due" | "created" | "priority" | "title") ?? "due")
  );

  useEffect(() => {
    setUi({
      tasksTab: tab,
      tasksSearch: search,
      tasksStatus: fStatus,
      tasksPriority: fPriority,
      tasksProject: fProject,
      tasksSort: sortBy,
    });
  }, [tab, search, fStatus, fPriority, fProject, sortBy]); // eslint-disable-line react-hooks/exhaustive-deps

  const projectOf = useMemo(() => {
    const m = new Map<string, (typeof projects)[number]>();
    for (const p of projects) m.set(p.id, p);
    return m;
  }, [projects]);

  const today = startOfDay(new Date()).getTime();
  const weekStart = startOfWeek(new Date()).getTime();

  const inMonth = (t: TaskWithExtras) => {
    const d = new Date(t.scheduled_start ?? t.due_at ?? 0);
    const now = new Date();
    return (
      d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear()
    );
  };

  const todayList = useMemo(() => {
    const list = tasks.filter(
      (t) =>
        t.status !== "done" &&
        (isOverdue(t) ||
          (t.scheduled_start !== null &&
            isSameDay(new Date(t.scheduled_start), new Date(today))) ||
          (t.due_at !== null && isSameDay(new Date(t.due_at), new Date(today))))
    );
    return list.sort((a, b) => {
      const ao = isOverdue(a) ? 0 : 1;
      const bo = isOverdue(b) ? 0 : 1;
      if (ao !== bo) return ao - bo;
      return (a.scheduled_start ?? a.due_at ?? 0) - (b.scheduled_start ?? b.due_at ?? 0);
    });
  }, [tasks, today]);

  const weekOverdue = useMemo(
    () =>
      tasks
        .filter((t) => t.status !== "done" && isOverdue(t))
        .sort(
          (a, b) => (a.scheduled_start ?? a.due_at ?? 0) - (b.scheduled_start ?? b.due_at ?? 0)
        ),
    [tasks]
  );

  const weekGroups = useMemo(() => {
    const days: Array<{ label: string; day: number; items: TaskWithExtras[] }> = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(weekStart + i * 86400000);
      const key = startOfDay(d).toISOString().slice(0, 10);
      const items = tasks.filter(
        (t) =>
          t.status !== "done" &&
          !isOverdue(t) &&
          (taskDayKey(t.scheduled_start) === key || taskDayKey(t.due_at) === key)
      );
      days.push({
        label: d.toLocaleDateString("en-US", { weekday: "long" }),
        day: d.getDate(),
        items: items.sort(
          (a, b) => (a.scheduled_start ?? a.due_at ?? 0) - (b.scheduled_start ?? b.due_at ?? 0)
        ),
      });
    }
    return days;
  }, [tasks, weekStart]);

  const monthGroups = useMemo(() => {
    const groups = new Map<number, TaskWithExtras[]>();
    const days = new Set<number>();
    for (const t of tasks) {
      if (t.status === "done" || !inMonth(t)) continue;
      const ref = t.scheduled_start ?? t.due_at;
      const day = ref ? new Date(ref).getDate() : null;
      if (day === null) continue;
      days.add(day);
      const list = groups.get(day) ?? [];
      list.push(t);
      groups.set(day, list);
    }
    const out: Array<{ day: number; label: string; items: TaskWithExtras[] }> = [];
    for (const day of [...days].sort((a, b) => a - b)) {
      const items = (groups.get(day) ?? []).sort(
        (a, b) => (a.scheduled_start ?? a.due_at ?? 0) - (b.scheduled_start ?? b.due_at ?? 0)
      );
      const d = new Date(new Date().getFullYear(), new Date().getMonth(), day);
      out.push({
        day,
        label: d.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" }),
        items,
      });
    }
    return out;
  }, [tasks]); // eslint-disable-line react-hooks/exhaustive-deps

  const allList = useMemo(() => {
    let list = tasks.filter((t) => {
      if (fStatus && t.status !== fStatus) return false;
      if (fPriority && t.priority !== fPriority) return false;
      if (fProject && t.project_id !== fProject) return false;
      if (
        search &&
        !t.title.toLowerCase().includes(search.toLowerCase()) &&
        !t.description.toLowerCase().includes(search.toLowerCase())
      )
        return false;
      return true;
    });
    const doneLast = (a: TaskWithExtras, b: TaskWithExtras) =>
      (a.status === "done" ? 1 : 0) - (b.status === "done" ? 1 : 0);
    const pRank = (p: Priority) => (p === "high" ? 0 : p === "medium" ? 1 : 2);
    switch (sortBy) {
      case "due":
        list = [...list].sort(
          (a, b) => (a.due_at ?? a.scheduled_start ?? 0) - (b.due_at ?? b.scheduled_start ?? 0)
        );
        break;
      case "created":
        list = [...list].sort((a, b) => b.created_at - a.created_at);
        break;
      case "priority":
        list = [...list].sort((a, b) => doneLast(a, b) || pRank(a.priority) - pRank(b.priority));
        break;
      case "title":
        list = [...list].sort((a, b) => a.title.localeCompare(b.title));
        break;
    }
    return list;
  }, [tasks, fStatus, fPriority, fProject, search, sortBy]);

  const todayDone = tasks.filter(
    (t) =>
      t.status === "done" &&
      (t.scheduled_start !== null && isSameDay(new Date(t.scheduled_start), new Date(today)))
  ).length;

  return (
    <div className="h-full overflow-y-auto">
      <div className="mx-auto max-w-3xl px-8 py-6">
        <header className="mb-4">
          <h1 className="text-xl font-semibold tracking-tight text-ink dark:text-[#e8efe9]">
            Tasks
          </h1>
          <p className="text-[13px] text-muted">
            Manage everything you need to get done.
          </p>
        </header>

        <div className="mb-4 flex items-center gap-1 border-b border-line pb-0 dark:border-line-dark">
          {TABS.map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={cn(
                "-mb-px border-b-2 px-3 py-2 text-[13px] transition-colors",
                tab === t.id
                  ? "border-br font-medium text-br-deep dark:text-[#a7d3ba]"
                  : "border-transparent text-muted hover:text-ink dark:hover:text-[#e8efe9]"
              )}
            >
              {t.label}
            </button>
          ))}
        </div>

        <QuickAdd />

        {tab === "today" && (
          <div className="mt-5">
            <p className="mb-2 text-[12px] text-muted">
              {todayList.length} task{todayList.length !== 1 ? "s" : ""} ·{" "}
              {todayDone} completed
            </p>
            {todayList.length === 0 ? (
              <EmptyState
                icon={<ListTodo className="h-5 w-5" />}
                title="Nothing due today"
                hint="Add a task above or schedule one for today."
              />
            ) : (
              todayList.map((t) => (
                <TaskItem
                  key={t.id}
                  task={t}
                  project={projectOf.get(t.project_id ?? "") ?? null}
                  onToggle={() =>
                    updateTask(t.id, { status: t.status === "done" ? "todo" : "done" })
                  }
                  onOpen={() => openTask(t.id)}
                />
              ))
            )}
          </div>
        )}

        {tab === "week" && (
          <div className="mt-5 space-y-5">
            {weekOverdue.length > 0 && (
              <section>
                <h3 className="mb-1 text-[12px] font-medium uppercase tracking-wider text-coral">
                  Overdue
                </h3>
                {weekOverdue.map((t) => (
                  <TaskItem
                    key={t.id}
                    task={t}
                    project={projectOf.get(t.project_id ?? "") ?? null}
                    onToggle={() =>
                      updateTask(t.id, { status: t.status === "done" ? "todo" : "done" })
                    }
                    onOpen={() => openTask(t.id)}
                  />
                ))}
              </section>
            )}
            {weekGroups.map((g) => {
              const items = g.items;
              if (items.length === 0) return null;
              return (
                <section key={g.day}>
                  <h3 className="mb-1 text-[12px] font-medium uppercase tracking-wider text-faint">
                    {g.label}
                  </h3>
                  {items.map((t) => (
                    <TaskItem
                      key={t.id}
                      task={t}
                      project={projectOf.get(t.project_id ?? "") ?? null}
                      onToggle={() =>
                        updateTask(t.id, { status: t.status === "done" ? "todo" : "done" })
                      }
                      onOpen={() => openTask(t.id)}
                    />
                  ))}
                </section>
              );
            })}
            {weekGroups.every((g) => g.items.length === 0) && weekOverdue.length === 0 && (
              <EmptyState
                icon={<ListTodo className="h-5 w-5" />}
                title="A quiet week"
                hint="Nothing scheduled or due this week."
              />
            )}
          </div>
        )}

        {tab === "month" && (
          <div className="mt-5 space-y-5">
            {monthGroups.map((g) => (
              <section key={g.day}>
                <h3 className="mb-1 text-[12px] font-medium uppercase tracking-wider text-faint">
                  {g.label}
                </h3>
                {g.items.map((t) => (
                  <TaskItem
                    key={t.id}
                    task={t}
                    project={projectOf.get(t.project_id ?? "") ?? null}
                    onToggle={() =>
                      updateTask(t.id, { status: t.status === "done" ? "todo" : "done" })
                    }
                    onOpen={() => openTask(t.id)}
                  />
                ))}
              </section>
            ))}
            {monthGroups.length === 0 && (
              <EmptyState
                icon={<ListTodo className="h-5 w-5" />}
                title="Nothing this month"
                hint="Tasks with a schedule or due date this month appear here."
              />
            )}
          </div>
        )}

        {tab === "all" && (
          <div className="mt-5">
            <div className="mb-3 flex flex-wrap items-center gap-2">
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search tasks…"
                className="input w-52 py-1.5 text-[13px]"
              />
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setFiltersOpen((o) => !o)}
                  className={cn(
                    "btn btn-outline",
                    (fStatus || fPriority || fProject) && "border-br text-br-deep"
                  )}
                >
                  <Filter className="h-3.5 w-3.5" /> Filters
                </button>
                <div className="flex items-center gap-1">
                  <ArrowDownUp className="h-3.5 w-3.5 text-faint" />
                  <Select value={sortBy} onValueChange={(v) => setSortBy(v as typeof sortBy)}>
                    <SelectTrigger className="w-36 py-1.5 text-[13px]">
                      <SelectValue placeholder="Sort" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="due">Sort: Due date</SelectItem>
                      <SelectItem value="created">Sort: Created</SelectItem>
                      <SelectItem value="priority">Sort: Priority</SelectItem>
                      <SelectItem value="title">Sort: Title</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            {filtersOpen && (
              <div className="mb-3 flex flex-wrap gap-3 rounded-lg border border-line bg-surface p-3 dark:border-line-dark dark:bg-surface-dark-card">
                <label className="flex items-center gap-2 text-[12px] text-muted">
                  Status
                  <Select
                    value={fStatus || "all"}
                    onValueChange={(v) => setFStatus(v === "all" ? "" : (v as TaskStatus))}
                  >
                    <SelectTrigger className="w-32 py-1 text-[13px]">
                      <SelectValue placeholder="Status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All</SelectItem>
                      {Object.entries(STATUS_LABELS).map(([k, v]) => (
                        <SelectItem key={k} value={k}>
                          {v}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </label>
                <label className="flex items-center gap-2 text-[12px] text-muted">
                  Priority
                  <Select
                    value={fPriority || "all"}
                    onValueChange={(v) => setFPriority(v === "all" ? "" : (v as Priority))}
                  >
                    <SelectTrigger className="w-32 py-1 text-[13px]">
                      <SelectValue placeholder="Priority" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All</SelectItem>
                      {Object.entries(PRIORITY_LABELS).map(([k, v]) => (
                        <SelectItem key={k} value={k}>
                          {v}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </label>
                <label className="flex items-center gap-2 text-[12px] text-muted">
                  Project
                  <Select
                    value={fProject || "all"}
                    onValueChange={(v) => setFProject(v === "all" ? "" : v)}
                  >
                    <SelectTrigger className="w-40 py-1 text-[13px]">
                      <SelectValue placeholder="Project" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All</SelectItem>
                      {projects.map((p) => (
                        <SelectItem key={p.id} value={p.id}>
                          {p.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </label>
                <button
                  className="btn btn-ghost ml-auto"
                  onClick={() => {
                    setFStatus("");
                    setFPriority("");
                    setFProject("");
                  }}
                >
                  Clear
                </button>
              </div>
            )}

            {allList.length === 0 ? (
              <EmptyState
                icon={<ListTodo className="h-5 w-5" />}
                title="No tasks"
                hint="Add your first task above."
              />
            ) : (
              allList.map((t) => (
                <TaskItem
                  key={t.id}
                  task={t}
                  project={projectOf.get(t.project_id ?? "") ?? null}
                  onToggle={() =>
                    updateTask(t.id, { status: t.status === "done" ? "todo" : "done" })
                  }
                  onOpen={() => openTask(t.id)}
                />
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
}
