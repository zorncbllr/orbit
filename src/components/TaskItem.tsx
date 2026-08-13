import { useEffect, useRef, useState } from "react";
import { CalendarClock, Circle, CircleCheck, ListChecks } from "lucide-react";
import { useStore, type TaskWithExtras } from "../lib/store";
import type { Project } from "../lib/types";
import { cn, formatTime, isOverdue, relativeTime } from "../lib/utils";

export default function TaskItem({
  task,
  project,
  onToggle,
  onOpen,
  showProject = true,
}: {
  task: TaskWithExtras;
  project?: Project | null;
  onToggle: () => void;
  onOpen: () => void;
  showProject?: boolean;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(task.title);
  const inputRef = useRef<HTMLInputElement>(null);
  const done = task.status === "done";
  const overdue = isOverdue(task);
  const subtaskDone = task.subtasks.filter((s) => s.completed).length;
  const subtaskTotal = task.subtasks.length;

  useEffect(() => {
    if (editing) inputRef.current?.select();
  }, [editing]);

  const commit = async () => {
    const title = draft.trim();
    setEditing(false);
    if (title && title !== task.title) {
      useStore.getState().updateTask(task.id, { title });
    }
  };

  const timeLabel = (() => {
    if (task.scheduled_start && task.scheduled_end) {
      return `${formatTime(task.scheduled_start)} – ${formatTime(task.scheduled_end)}`;
    }
    if (task.scheduled_start) return formatTime(task.scheduled_start);
    return null;
  })();

  return (
    <div
      className="group flex cursor-pointer items-start gap-3 rounded-lg px-2 py-2 transition-colors hover:bg-surface-soft dark:hover:bg-surface-dark"
      onClick={onOpen}
      onDoubleClick={(e) => {
        e.stopPropagation();
        setEditing(true);
      }}
    >
      <button
        onClick={(e) => {
          e.stopPropagation();
          onToggle();
        }}
        aria-label={done ? "Mark as not done" : "Mark as done"}
        className={cn(
          "mt-0.5 flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-full border transition-colors",
          done
            ? "border-br bg-br text-white"
            : "border-line bg-surface text-transparent hover:border-br hover:text-br/40 dark:border-line-dark dark:bg-surface-dark-card"
        )}
      >
        <CircleCheck className="h-3 w-3" strokeWidth={2.5} />
      </button>

      <div className="min-w-0 flex-1">
        {editing ? (
          <input
            ref={inputRef}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onBlur={commit}
            onKeyDown={(e) => {
              if (e.key === "Enter") commit();
              if (e.key === "Escape") {
                setDraft(task.title);
                setEditing(false);
              }
            }}
            onClick={(e) => e.stopPropagation()}
            className="input py-1"
          />
        ) : (
          <p
            className={cn(
              "text-[13.5px] leading-snug text-ink dark:text-[#e8efe9]",
              done && "text-faint line-through"
            )}
          >
            {task.title}
          </p>
        )}

        <div className="mt-1 flex flex-wrap items-center gap-1.5">
          {overdue && (
            <span className="chip bg-coral/10 text-coral">
              <CalendarClock className="h-3 w-3" /> Overdue
            </span>
          )}
          {timeLabel && (
            <span className="chip text-muted">
              <CalendarClock className="h-3 w-3" />
              {timeLabel}
            </span>
          )}
          {task.due_at && (
            <span className={cn("chip", overdue ? "text-coral" : "text-muted")}>
              Due {new Date(task.due_at).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
            </span>
          )}
          {showProject && project && (
            <span className="chip text-muted">
              <Circle
                className="h-2.5 w-2.5 fill-current"
                style={{ color: project.color ?? "var(--color-br)" }}
              />
              {project.name}
            </span>
          )}
          {task.status === "in_progress" && (
            <span className="chip bg-amber/10 text-amber">In progress</span>
          )}
          {task.status === "blocked" && (
            <span className="chip bg-coral/10 text-coral">Blocked</span>
          )}
          {subtaskTotal > 0 && (
            <span className="chip text-faint">
              <ListChecks className="h-3 w-3" />
              {subtaskDone}/{subtaskTotal}
            </span>
          )}
        </div>
      </div>

      <span className="mt-1 hidden shrink-0 text-[11px] text-faint group-hover:block">
        {relativeTime(task.updated_at)}
      </span>
    </div>
  );
}
