import { memo, useMemo, useState } from "react";
import { CalendarClock, Copy, Link2, NotebookPen, Plus, Trash2, X } from "lucide-react";
import { useStore } from "../lib/store";
import {
  PRIORITY_LABELS,
  STATUS_LABELS,
  cn,
  relativeTime,
  relativeDateName,
} from "../lib/utils";
import type { Priority, TaskStatus } from "../lib/types";
import { parseSchedule, scheduleSummary } from "../lib/schedule";
import { ConfirmDialog } from "./ui";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./ui/select";

const STATUSES: TaskStatus[] = ["todo", "in_progress", "done", "backlog"];

const TaskTitleField = memo(function TaskTitleField({
  taskId,
  initial,
}: {
  taskId: string;
  initial: string;
}) {
  const [value, setValue] = useState(initial);
  return (
    <input
      value={value}
      onChange={(e) => setValue(e.target.value)}
      onBlur={() => {
        const v = value.trim();
        if (v && v !== initial) useStore.getState().updateTask(taskId, { title: v });
      }}
      placeholder="Task title"
      className="input border-transparent bg-transparent px-0 py-1 text-lg font-medium text-ink shadow-none focus:border-transparent focus:shadow-none dark:text-[#e8efe9]"
    />
  );
});

const TaskDescriptionField = memo(function TaskDescriptionField({
  taskId,
  initial,
}: {
  taskId: string;
  initial: string;
}) {
  const [value, setValue] = useState(initial);
  return (
    <textarea
      value={value}
      onChange={(e) => setValue(e.target.value)}
      onBlur={() => {
        if (value !== initial) useStore.getState().updateTask(taskId, { description: value });
      }}
      rows={6}
      placeholder="Add a description…"
      className="input resize-y"
    />
  );
});

export default function TaskDrawer({ taskId }: { taskId?: string }) {
  const task = useStore((s) => s.tasks.find((t) => t.id === taskId));
  const projects = useStore((s) => s.projects);
  const tasks = useStore((s) => s.tasks);
  const notes = useStore((s) => s.notes);
  const navigate = useStore((s) => s.navigate);
  const closeTask = useStore((s) => s.closeTask);
  const params = useStore((s) => s.params);

  const [subtaskInput, setSubtaskInput] = useState("");
  const [nl, setNl] = useState("");
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [depValue, setDepValue] = useState("__add");

  const sched = useMemo(() => {
    const s = task?.scheduled_start;
    const e = task?.scheduled_end;
    if (s && e && e > s) return { start: s, end: e };
    return null;
  }, [task?.scheduled_start, task?.scheduled_end]);

  const nlParsed = useMemo(() => (nl.trim() ? parseSchedule(nl) : null), [nl]);

  const { updateTask, deleteTask, duplicateTask } = useStore.getState();

  if (!task) {
    return (
      <div className="flex h-full w-[440px] shrink-0 flex-col border-l border-line bg-surface p-6 dark:border-line-dark dark:bg-surface-dark-card">
        <button
          onClick={closeTask}
          className="btn btn-ghost"
        >
          <X className="h-4 w-4" /> Close
        </button>
        <p className="mt-6 text-sm text-muted">Task not found.</p>
      </div>
    );
  }

  const linkedNotes = notes.filter((n) => n.task_id === task.id);
  const depOptions = tasks.filter((t) => t.id !== task.id && t.status !== "done");

  const push = (patch: Parameters<typeof updateTask>[1]) => {
    updateTask(task.id, patch);
  };

  const saveSubtasks = async (title: string) => {
    const t = title.trim();
    if (!t) return;
    const { addSubtask } = useStore.getState();
    await addSubtask(task.id, t);
    setSubtaskInput("");
  };

  const addLinkedNote = async () => {
    const { createNote } = useStore.getState();
    const id = await createNote({ title: "Note", task_id: task.id, project_id: task.project_id });
    navigate("notes", { noteId: id });
  };

  const nlSummary =
    nlParsed && (nlParsed.due_at || nlParsed.scheduled_start)
      ? scheduleSummary(nlParsed)
      : null;

  const applyNl = () => {
    if (!nlParsed) return;
    const patch: Parameters<typeof updateTask>[1] = {};
    if (nlParsed.due_at != null) patch.due_at = nlParsed.due_at;
    if (nlParsed.scheduled_start != null) {
      patch.scheduled_start = nlParsed.scheduled_start;
      patch.scheduled_end = nlParsed.scheduled_end ?? null;
    }
    push(patch);
    setNl("");
  };

  return (
    <div className="flex h-full w-[440px] shrink-0 flex-col border-l border-line bg-surface dark:border-line-dark dark:bg-surface-dark-card">
      <div className="flex items-center justify-between border-b border-line px-5 py-3 dark:border-line-dark">
        <span className="text-[11px] font-medium uppercase tracking-wider text-faint">
          Task
        </span>
        <button
          onClick={closeTask}
          aria-label="Close"
          className="rounded-md p-1 text-muted transition-colors hover:bg-surface-soft hover:text-ink dark:hover:bg-surface-dark"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-5 py-4">
        <TaskTitleField taskId={task.id} initial={task.title} />

        <div className="mt-2 flex flex-wrap items-center gap-1.5">
          {linkedNotes.length > 0 && (
            <span className="chip bg-br-light text-br-deep dark:bg-br-light-dark dark:text-[#a7d3ba]">
              <NotebookPen className="h-3 w-3" /> {linkedNotes.length} note{linkedNotes.length > 1 ? "s" : ""}
            </span>
          )}
          {task.subtasks.length > 0 && (
            <span className="chip bg-br-light text-br-deep dark:bg-br-light-dark dark:text-[#a7d3ba]">
              {task.subtasks.filter((s) => s.completed).length}/{task.subtasks.length} subtasks
            </span>
          )}
          {sched && (
            <span className="chip text-muted">
              <CalendarClock className="h-3 w-3" />
              {relativeDateName(sched.start)} · {new Date(sched.start).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}–{new Date(sched.end).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}
            </span>
          )}
        </div>

        <div className="mt-5 space-y-4">
          <div>
            <label className="mb-1.5 block text-[11px] font-medium uppercase tracking-wider text-faint">
              Status
            </label>
            <div className="flex gap-1 rounded-lg bg-surface-soft p-1 dark:bg-surface-dark">
              {STATUSES.map((st) => (
                <button
                  key={st}
                  onClick={() => push({ status: st })}
                  className={cn(
                    "flex-1 rounded-md px-2 py-1 text-[12px] font-medium transition-colors",
                    task.status === st
                      ? "bg-surface text-ink shadow-sm dark:bg-surface-dark-card dark:text-[#e8efe9]"
                      : "text-muted hover:text-ink dark:hover:text-[#e8efe9]"
                  )}
                >
                  {STATUS_LABELS[st]}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1.5 block text-[11px] font-medium uppercase tracking-wider text-faint">
                Priority
              </label>
              <Select value={task.priority} onValueChange={(v) => push({ priority: v as Priority })}>
                <SelectTrigger>
                  <SelectValue placeholder="Priority" />
                </SelectTrigger>
                <SelectContent>
                  {(["low", "medium", "high"] as Priority[]).map((p) => (
                    <SelectItem key={p} value={p}>
                      {PRIORITY_LABELS[p]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="mb-1.5 block text-[11px] font-medium uppercase tracking-wider text-faint">
                Project
              </label>
              <Select
                value={task.project_id ?? "none"}
                onValueChange={(v) => push({ project_id: v === "none" ? null : v })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Project" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None</SelectItem>
                  {projects.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div>
            <label className="mb-1.5 block text-[11px] font-medium uppercase tracking-wider text-faint">
              When
            </label>
            <div className="space-y-2">
              <div className="flex items-center gap-2 rounded-lg border border-dashed border-line px-2.5 py-1.5 transition-colors focus-within:border-solid focus-within:border-br dark:border-line-dark">
                <input
                  value={nl}
                  onChange={(e) => setNl(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && applyNl()}
                  placeholder='e.g. "tomorrow 3pm to 5pm"'
                  className="flex-1 bg-transparent text-[13px] text-ink placeholder:text-faint focus:outline-none dark:text-[#e8efe9]"
                />
                {nlSummary && (
                  <button onClick={applyNl} className="btn btn-ghost shrink-0 px-2 py-0.5 text-[11px]">
                    Add
                  </button>
                )}
              </div>
              {nlSummary && (
                <p className="text-[11.5px] text-br-deep dark:text-[#a7d3ba]">{nlSummary}</p>
              )}
            </div>
          </div>

          <div>
            <label className="mb-1.5 block text-[11px] font-medium uppercase tracking-wider text-faint">
              Description
            </label>
            <TaskDescriptionField taskId={task.id} initial={task.description} />
          </div>

          <div>
            <label className="mb-1.5 block text-[11px] font-medium uppercase tracking-wider text-faint">
              Subtasks
            </label>
            <div className="space-y-1">
              {task.subtasks.map((s) => (
                <div key={s.id} className="group flex items-center gap-2">
                  <button
                    onClick={() => useStore.getState().toggleSubtask(task.id, s.id)}
                    className={cn(
                      "h-4 w-4 shrink-0 rounded border transition-colors",
                      s.completed
                        ? "border-br bg-br"
                        : "border-line hover:border-br dark:border-line-dark"
                    )}
                    aria-label={s.completed ? "Mark subtask incomplete" : "Mark subtask complete"}
                  >
                    {s.completed && (
                      <svg viewBox="0 0 24 24" className="h-3 w-3 text-white" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M20 6 9 17l-5-5" />
                      </svg>
                    )}
                  </button>
                  <span className={cn("flex-1 text-[13px]", s.completed && "text-faint line-through")}>
                    {s.title}
                  </span>
                  <button
                    onClick={() => useStore.getState().removeSubtask(task.id, s.id)}
                    className="hidden text-faint hover:text-coral group-hover:block"
                    aria-label="Delete subtask"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))}
            </div>
            <div className="mt-2 flex gap-2">
              <input
                value={subtaskInput}
                onChange={(e) => setSubtaskInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && saveSubtasks(subtaskInput)}
                placeholder="Add subtask…"
                className="input py-1.5 text-[13px]"
              />
              <button className="btn btn-ghost shrink-0" onClick={() => saveSubtasks(subtaskInput)}>
                <Plus className="h-4 w-4" />
              </button>
            </div>
          </div>

          <div>
            <label className="mb-1.5 block text-[11px] font-medium uppercase tracking-wider text-faint">
              Depends on
            </label>
            <div className="flex flex-wrap gap-1.5">
              {task.dependencies.map((depId) => {
                const dep = tasks.find((t) => t.id === depId);
                if (!dep) return null;
                return (
                  <span key={depId} className="chip border border-line text-ink-soft dark:border-line-dark dark:text-[#cfd9d2]">
                    <Link2 className="h-3 w-3" />
                    {dep.title}
                    <button
                      onClick={() =>
                        useStore
                          .getState()
                          .setDependencies(task.id, task.dependencies.filter((d) => d !== depId))
                      }
                      className="ml-0.5 text-faint hover:text-coral"
                      aria-label="Remove dependency"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </span>
                );
              })}
            </div>
            <Select
              value={depValue}
              onValueChange={(v) => {
                useStore
                  .getState()
                  .setDependencies(task.id, [...task.dependencies, v]);
                setDepValue("__add");
              }}
            >
              <SelectTrigger className="mt-2">
                <SelectValue placeholder="Add dependency…" />
              </SelectTrigger>
              <SelectContent>
                {depOptions
                  .filter((t) => !task.dependencies.includes(t.id))
                  .map((t) => (
                    <SelectItem key={t.id} value={t.id}>
                      {t.title}
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <label className="mb-1.5 block text-[11px] font-medium uppercase tracking-wider text-faint">
              Notes
            </label>
            <div className="space-y-1">
              {linkedNotes.map((n) => (
                <button
                  key={n.id}
                  onClick={() => navigate("notes", { noteId: n.id })}
                  className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-[13px] text-ink-soft transition-colors hover:bg-surface-soft dark:text-[#cfd9d2] dark:hover:bg-surface-dark"
                >
                  <NotebookPen className="h-3.5 w-3.5 shrink-0 text-br" />
                  <span className="truncate">{n.title || "Untitled"}</span>
                </button>
              ))}
            </div>
            <button className="btn btn-outline mt-2 w-full" onClick={addLinkedNote}>
              <NotebookPen className="h-4 w-4" /> New note
            </button>
          </div>

          <div className="border-t border-line pt-3 text-[11px] text-faint dark:border-line-dark">
            <p>Created {relativeTime(task.created_at)}</p>
            <p>Updated {relativeTime(task.updated_at)}</p>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-2 border-t border-line px-5 py-3 dark:border-line-dark">
        <button className="btn btn-ghost" onClick={() => duplicateTask(task.id)}>
          <Copy className="h-4 w-4" /> Duplicate
        </button>
        <div className="flex-1" />
        <button
          className="btn btn-danger-ghost"
          onClick={() => setConfirmDelete(true)}
        >
          <Trash2 className="h-4 w-4" /> Delete
        </button>
      </div>

      <ConfirmDialog
        open={confirmDelete}
        title="Delete task"
        message={`Delete "${task.title}"? This cannot be undone.`}
        onConfirm={() => {
          deleteTask(task.id);
          setConfirmDelete(false);
          if (params.taskId === task.id) closeTask();
        }}
        onCancel={() => setConfirmDelete(false)}
      />
    </div>
  );
}
