import { useEffect, useMemo, useRef, useState } from "react";
import {
  Calendar,
  FolderKanban,
  ListTodo,
  NotebookPen,
  Search,
} from "lucide-react";
import { useStore } from "../lib/store";
import { cn } from "../lib/utils";

interface Result {
  type: "task" | "note" | "project" | "event";
  id: string;
  title: string;
  subtitle?: string;
}

export default function SearchDialog() {
  const open = useStore((s) => s.searchOpen);
  const setOpen = useStore((s) => s.setSearchOpen);
  const tasks = useStore((s) => s.tasks);
  const notes = useStore((s) => s.notes);
  const projects = useStore((s) => s.projects);
  const events = useStore((s) => s.events);
  const navigate = useStore((s) => s.navigate);
  const toast = useStore((s) => s.toast);

  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (open) {
      setQuery("");
      setActive(0);
      setTimeout(() => inputRef.current?.focus(), 10);
    }
  }, [open]);

  const results = useMemo<Result[]>(() => {
    const q = query.trim().toLowerCase();
    if (!q) return [];
    const out: Result[] = [];
    const push = (type: Result["type"], id: string, title: string, subtitle?: string) =>
      out.push({ type, id, title, subtitle });

    for (const t of tasks) {
      if (t.title.toLowerCase().includes(q))
        push("task", t.id, t.title, "Task");
    }
    for (const p of projects) {
      if (p.name.toLowerCase().includes(q))
        push("project", p.id, p.name, "Project");
    }
    for (const n of notes) {
      if (
        n.title.toLowerCase().includes(q) ||
        n.content.toLowerCase().includes(q)
      )
        push("note", n.id, n.title || "Untitled note", "Note");
    }
    for (const e of events) {
      if (e.title.toLowerCase().includes(q))
        push("event", e.id, e.title, "Event");
    }
    return out.slice(0, 30);
  }, [query, tasks, notes, projects, events]);

  useEffect(() => {
    setActive(0);
    listRef.current?.scrollTo({ top: 0 });
  }, [query, results.length]);

  const go = (r: Result) => {
    setOpen(false);
    switch (r.type) {
      case "task":
        navigate("tasks", { taskId: r.id });
        break;
      case "note":
        navigate("notes", { noteId: r.id });
        break;
      case "project":
        navigate("project", { projectId: r.id });
        break;
      case "event":
        navigate("calendar", { eventId: r.id });
        break;
    }
  };

  if (!open) return null;

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActive((a) => Math.min(a + 1, results.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((a) => Math.max(a - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (results[active]) go(results[active]);
      else toast("No results for that search", "info");
    } else if (e.key === "Escape") {
      setOpen(false);
    }
  };

  const iconFor = (type: Result["type"]) => {
    switch (type) {
      case "task":
        return <ListTodo className="h-4 w-4 text-br" />;
      case "note":
        return <NotebookPen className="h-4 w-4 text-amber" />;
      case "project":
        return <FolderKanban className="h-4 w-4 text-br" />;
      case "event":
        return <Calendar className="h-4 w-4 text-coral" />;
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-[18vh]">
      <div
        className="absolute inset-0 bg-ink/30 backdrop-blur-[2px]"
        onClick={() => setOpen(false)}
      />
      <div className="relative z-10 w-full max-w-xl overflow-hidden rounded-xl border border-line bg-surface shadow-2xl dark:border-line-dark dark:bg-surface-dark-card">
        <div className="flex items-center gap-2.5 border-b border-line px-4 py-3 dark:border-line-dark">
          <Search className="h-4 w-4 shrink-0 text-muted" />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={onKeyDown}
            placeholder="Search tasks, notes, projects, events…"
            className="flex-1 bg-transparent text-[14px] text-ink placeholder:text-faint focus:outline-none dark:text-[#e8efe9]"
          />
          <kbd className="rounded border border-line px-1.5 py-0.5 text-[10px] text-faint dark:border-line-dark">
            Esc
          </kbd>
        </div>

        <div ref={listRef} className="max-h-[46vh] overflow-y-auto p-2">
          {query.trim() === "" && (
            <p className="px-3 py-6 text-center text-[13px] text-muted">
              Type to search across your workspace.
            </p>
          )}
          {query.trim() !== "" && results.length === 0 && (
            <p className="px-3 py-6 text-center text-[13px] text-muted">
              Nothing found for “{query}”.
            </p>
          )}
          {results.map((r, i) => (
            <button
              key={`${r.type}-${r.id}`}
              onMouseEnter={() => setActive(i)}
              onClick={() => go(r)}
              className={cn(
                "flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left transition-colors",
                i === active
                  ? "bg-br-light dark:bg-br-light-dark"
                  : "hover:bg-surface-soft dark:hover:bg-surface-dark"
              )}
            >
              {iconFor(r.type)}
              <div className="min-w-0 flex-1">
                <p className="truncate text-[13.5px] text-ink dark:text-[#e8efe9]">
                  {r.title}
                </p>
                {r.subtitle && (
                  <p className="text-[11px] text-faint">{r.subtitle}</p>
                )}
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
