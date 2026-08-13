import { useMemo, useState } from "react";
import { Circle, CircleCheck, Plus } from "lucide-react";
import { useStore, type TaskWithExtras } from "../lib/store";
import {
  STATUS_LABELS,
  STATUS_ORDER,
  cn,
  formatShort,
  isOverdue,
} from "../lib/utils";
import type { TaskStatus } from "../lib/types";

function KanbanCard({ task }: { task: TaskWithExtras }) {
  const navigate = useStore((s) => s.navigate);
  const project = useStore((s) => s.projects.find((p) => p.id === task.project_id));
  const overdue = isOverdue(task);

  return (
    <div
      draggable
      onDragStart={(e) => {
        e.dataTransfer.setData("text/orbit-task", task.id);
        e.dataTransfer.setData("text/plain", task.id);
        e.dataTransfer.effectAllowed = "move";
      }}
      onClick={() => navigate("tasks", { taskId: task.id })}
      className="group mb-2 cursor-grab rounded-lg border border-line bg-surface px-3 py-2.5 shadow-sm transition-all hover:border-br/60 dark:border-line-dark dark:bg-surface-dark-card"
    >
      <p className="text-[13px] leading-snug text-ink dark:text-[#e8efe9]">
        {task.title}
      </p>
      <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
        {project && (
          <span className="chip text-muted">
            <Circle
              className="h-2.5 w-2.5 fill-current"
              style={{ color: project.color ?? "var(--color-br)" }}
            />
            {project.name}
          </span>
        )}
        {task.due_at && (
          <span className={cn("chip", overdue ? "bg-coral/10 text-coral" : "text-muted")}>
            {formatShort(new Date(task.due_at))}
          </span>
        )}
        {task.subtasks.length > 0 &&
          task.subtasks.every((s) => s.completed) && (
            <CircleCheck className="h-3.5 w-3.5 text-br" />
          )}
        {task.subtasks.length > 0 && (
          <span className="text-[10px] text-faint">
            {task.subtasks.filter((s) => s.completed).length}/{task.subtasks.length}
          </span>
        )}
      </div>
    </div>
  );
}

export default function KanbanBoard({ projectId }: { projectId?: string }) {
  const allTasks = useStore((s) => s.tasks);
  const createTask = useStore((s) => s.createTask);
  const updateTask = useStore((s) => s.updateTask);

  const tasks = useMemo(
    () => allTasks.filter((t) => (projectId ? t.project_id === projectId : true)),
    [allTasks, projectId]
  );

  const [dragOver, setDragOver] = useState<TaskStatus | null>(null);
  const [newTitle, setNewTitle] = useState<Record<string, string>>({});

  const columns = STATUS_ORDER.map((status) => ({
    status,
    items: tasks
      .filter((t) => t.status === status)
      .sort(
        (a, b) => (a.scheduled_start ?? a.due_at ?? 0) - (b.scheduled_start ?? b.due_at ?? 0)
      ),
  }));

  const onDrop = (e: React.DragEvent, status: TaskStatus) => {
    e.preventDefault();
    setDragOver(null);
    const id =
      e.dataTransfer.getData("text/orbit-task") ||
      e.dataTransfer.getData("text/plain");
    if (!id) return;
    updateTask(id, { status });
  };

  const addTo = async (status: TaskStatus) => {
    const title = newTitle[status]?.trim();
    if (!title) return;
    setNewTitle((n) => ({ ...n, [status]: "" }));
    await createTask({ title, status, project_id: projectId ?? null });
  };

  return (
    <div className="grid h-full grid-cols-4 gap-3">
      {columns.map(({ status, items }) => (
        <div
          key={status}
          onDragOver={(e) => {
            e.preventDefault();
            e.dataTransfer.dropEffect = "move";
            setDragOver(status);
          }}
          onDragLeave={() => setDragOver((d) => (d === status ? null : d))}
          onDrop={(e) => onDrop(e, status)}
          className={cn(
            "flex min-h-0 flex-col rounded-xl border transition-colors",
            dragOver === status
              ? "border-br bg-br-light/60 dark:border-[#5f9d7c] dark:bg-br-light-dark/60"
              : "border-line bg-surface-soft/60 dark:border-line-dark dark:bg-surface-dark"
          )}
        >
          <div className="flex items-center justify-between px-3 pb-1 pt-2.5">
            <span className="text-[12px] font-medium uppercase tracking-wider text-muted">
              {STATUS_LABELS[status]}
            </span>
            <span
              className={cn(
                "flex h-5 min-w-5 items-center justify-center rounded-full px-1 text-[11px] font-medium",
                status === "done"
                  ? "bg-br-light text-br-deep dark:bg-br-light-dark dark:text-[#a7d3ba]"
                  : "bg-surface text-faint dark:bg-surface-dark-card"
              )}
            >
              {items.length}
            </span>
          </div>

          <div className="min-h-[40px] flex-1 space-y-0 overflow-y-auto px-2 pb-1">
            {items.length === 0 && (
              <p className="rounded-lg border border-dashed border-line px-2 py-3 text-center text-[11px] text-faint dark:border-line-dark">
                Drop tasks here
              </p>
            )}
            {items.map((t) => (
              <KanbanCard key={t.id} task={t} />
            ))}
          </div>

          <div className="p-2">
            <div className="flex items-center gap-1.5 rounded-md border border-transparent px-1.5 py-1 transition-colors hover:border-line dark:hover:border-line-dark">
              <Plus className="h-3.5 w-3.5 shrink-0 text-faint" />
              <input
                value={newTitle[status] ?? ""}
                onChange={(e) =>
                  setNewTitle((n) => ({ ...n, [status]: e.target.value }))
                }
                onKeyDown={(e) => e.key === "Enter" && addTo(status)}
                placeholder="Add a card…"
                className="w-full bg-transparent text-[12.5px] text-ink placeholder:text-faint focus:outline-none dark:text-[#e8efe9]"
              />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}