import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Bold,
  FilePlus2,
  Heading2,
  Italic,
  List,
  ListOrdered,
  NotebookPen,
  Quote,
  Redo2,
  Search,
  Trash2,
  Undo2,
} from "lucide-react";
import { useStore } from "../lib/store";
import { cn, relativeTime } from "../lib/utils";
import { ConfirmDialog, EmptyState } from "../components/ui";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../components/ui/select";

const toolbarIds = ["h2", "bold", "italic", "ul", "ol", "quote"] as const;

export default function NotesPage() {
  const notes = useStore((s) => s.notes);
  const projects = useStore((s) => s.projects);
  const tasks = useStore((s) => s.tasks);
  const navigate = useStore((s) => s.navigate);
  const noteId = useStore((s) => s.params.noteId);

  const [query, setQuery] = useState("");
  const [editorTitle, setEditorTitle] = useState("");
  const [projectId, setProjectId] = useState<string>("none");
  const [taskId, setTaskId] = useState<string>("none");
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [activeFormats, setActiveFormats] = useState<Record<string, boolean>>({});
  const editorRef = useRef<HTMLDivElement>(null);
  const loadedNoteIdRef = useRef<string | null>(null);
  const rafRef = useRef<number | null>(null);

  const toolbars = [
    {
      id: "h2",
      icon: Heading2,
      exec: () =>
        document.execCommand(
          "formatBlock",
          false,
          getActive()?.h2 ? "p" : "h2"
        ),
    },
    { id: "bold", icon: Bold, exec: () => document.execCommand("bold") },
    { id: "italic", icon: Italic, exec: () => document.execCommand("italic") },
    { id: "ul", icon: List, exec: () => document.execCommand("insertUnorderedList") },
    { id: "ol", icon: ListOrdered, exec: () => document.execCommand("insertOrderedList") },
    {
      id: "quote",
      icon: Quote,
      exec: () =>
        document.execCommand(
          "formatBlock",
          false,
          getActive()?.quote ? "p" : "blockquote"
        ),
    },
  ];

  const activeId = noteId ?? notes[0]?.id;

  const active = useMemo(
    () => notes.find((n) => n.id === activeId) ?? null,
    [notes, activeId]
  );

  useEffect(() => {
    if (loadedNoteIdRef.current !== active?.id) {
      loadedNoteIdRef.current = active?.id ?? null;
      setEditorTitle(active?.title ?? "");
      setProjectId(active?.project_id ?? "none");
      setTaskId(active?.task_id ?? "none");
      setActiveFormats({});
      if (editorRef.current) editorRef.current.innerHTML = active?.content ?? "";
    }
  }, [activeId, active?.updated_at]); // eslint-disable-line react-hooks/exhaustive-deps

  const getActive = useCallback((): Record<string, boolean> | null => {
    const sel = document.getSelection();
    const el = editorRef.current;
    if (!el || !sel || sel.rangeCount === 0 || !sel.anchorNode || !el.contains(sel.anchorNode))
      return null;
    const active: Record<string, boolean> = {
      h2: false,
      bold: false,
      italic: false,
      ul: false,
      ol: false,
      quote: false,
    };
    let n: Node | null = sel.anchorNode;
    while (n && n !== el && el.contains(n)) {
      if (n.nodeType === Node.ELEMENT_NODE) {
        const tag = (n as Element).tagName.toLowerCase();
        if (tag === "h2") active.h2 = true;
        if (tag === "b" || tag === "strong") active.bold = true;
        if (tag === "i" || tag === "em") active.italic = true;
        if (tag === "ul") active.ul = true;
        if (tag === "ol") active.ol = true;
        if (tag === "blockquote") active.quote = true;
      }
      n = n.parentNode;
    }
    return active;
  }, []);

  const refreshFormats = useCallback(() => {
    if (rafRef.current != null) cancelAnimationFrame(rafRef.current);
    rafRef.current = requestAnimationFrame(() => {
      rafRef.current = null;
      const next = getActive() ?? {};
      setActiveFormats((prev) => {
        const changed =
          Object.keys(next).length !== Object.keys(prev).length ||
          toolbarIds.some((id) => next[id] !== prev[id]);
        return changed ? next : prev;
      });
    });
  }, [getActive]);

  useEffect(() => {
    document.addEventListener("selectionchange", refreshFormats);
    return () => {
      document.removeEventListener("selectionchange", refreshFormats);
      if (rafRef.current != null) cancelAnimationFrame(rafRef.current);
    };
  }, [refreshFormats]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    let list = notes;
    if (q) {
      list = list.filter(
        (n) =>
          n.title.toLowerCase().includes(q) ||
          n.content.replace(/<[^>]*>/g, "").toLowerCase().includes(q)
      );
    }
    return list;
  }, [notes, query]);

  const createNote = async () => {
    const { createNote } = useStore.getState();
    const id = await createNote({ title: "Untitled" });
    navigate("notes", { noteId: id });
  };

  const projectName = (pid: string | null) =>
    projects.find((p) => p.id === pid)?.name;

  const saveTitle = () => {
    if (active) {
      const t = editorTitle.trim();
      useStore.getState().updateNote(active.id, { title: t || "Untitled" });
    }
  };

  const saveContent = (c: string) => {
    if (active) useStore.getState().updateNote(active.id, { content: c });
  };

  const applyFormat = (exec: () => boolean) => {
    if (editorRef.current) editorRef.current.focus();
    exec();
    if (editorRef.current) saveContent(editorRef.current.innerHTML);
    refreshFormats();
  };

  const applyCommand = (command: "undo" | "redo") => {
    if (editorRef.current) editorRef.current.focus();
    document.execCommand(command);
    if (editorRef.current) saveContent(editorRef.current.innerHTML);
    refreshFormats();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    const mod = e.ctrlKey || e.metaKey;
    if (!mod) return;
    const k = e.key.toLowerCase();
    if (k === "h") {
      e.preventDefault();
      const h2 = toolbars.find((t) => t.id === "h2");
      if (h2) applyFormat(h2.exec);
    } else if (k === "z") {
      e.preventDefault();
      applyCommand(e.shiftKey ? "redo" : "undo");
    } else if (k === "y") {
      e.preventDefault();
      applyCommand("redo");
    }
  };

  return (
    <div className="flex h-full">
      <div className="flex w-72 shrink-0 flex-col border-r border-line dark:border-line-dark">
        <div className="border-b border-line p-3 dark:border-line-dark">
          <div className="relative">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-faint" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search notes…"
              className="input py-1.5 pl-8 text-[13px]"
            />
          </div>
          <button className="btn btn-primary mt-2 w-full" onClick={createNote}>
            <FilePlus2 className="h-4 w-4" /> New Note
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-1.5">
          {filtered.length === 0 ? (
            <div className="px-3 py-8 text-center text-[13px] text-muted">
              {query ? "No matching notes." : "No notes yet."}
            </div>
          ) : (
            filtered.map((n) => (
              <button
                key={n.id}
                onClick={() => navigate("notes", { noteId: n.id })}
                className={cn(
                  "block w-full rounded-lg px-3 py-2 text-left transition-colors",
                  n.id === active?.id
                    ? "bg-br-light dark:bg-br-light-dark"
                    : "hover:bg-surface-soft dark:hover:bg-surface-dark"
                )}
              >
                <p
                  className={cn(
                    "truncate text-[13px] font-medium",
                    n.id === active?.id
                      ? "text-br-deep dark:text-[#a7d3ba]"
                      : "text-ink dark:text-[#e8efe9]"
                  )}
                >
                  {n.title || "Untitled"}
                </p>
                <p className="mt-0.5 flex items-center justify-between gap-2">
                  <span
                    className={cn(
                      "truncate text-[11px]",
                      n.id === active?.id ? "text-br-deep/70" : "text-faint"
                    )}
                  >
                    {projectName(n.project_id) ?? "No project"}
                  </span>
                  <span className="shrink-0 text-[10px] text-faint">
                    Updated {relativeTime(n.updated_at)}
                  </span>
                </p>
              </button>
            ))
          )}
        </div>
      </div>

      <div className="flex min-w-0 flex-1 flex-col">
        {!active ? (
          <EmptyState
            icon={<NotebookPen className="h-5 w-5" />}
            title="Select a note"
            hint="Pick a note from the list or create a new one."
          />
        ) : (
          <>
            <div className="flex items-center gap-3 border-b border-line px-5 py-3 dark:border-line-dark">
              <input
                value={editorTitle}
                onChange={(e) => setEditorTitle(e.target.value)}
                onBlur={saveTitle}
                placeholder="Note title"
                className="flex-1 bg-transparent py-1 text-lg font-medium text-ink placeholder:text-faint focus:outline-none dark:text-[#e8efe9]"
              />
              <button
                className="btn btn-danger-ghost"
                onClick={() => setConfirmDelete(true)}
                aria-label="Delete note"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>

            <div className="flex flex-wrap items-center gap-3 border-b border-line px-5 py-2 dark:border-line-dark">
              <div className="flex items-center gap-0.5">
                {toolbars.map(({ id, icon: Icon, exec }) => (
                  <button
                    key={id}
                    onMouseDown={(e) => {
                      e.preventDefault();
                      applyFormat(exec);
                    }}
                    className={cn(
                      "rounded-md p-1.5 transition-colors",
                      activeFormats[id]
                        ? "bg-br-light text-br-deep dark:bg-br-light-dark dark:text-[#a7d3ba]"
                        : "text-muted hover:bg-surface-soft hover:text-ink dark:hover:bg-surface-dark dark:hover:text-[#e8efe9]"
                    )}
                    aria-label="Format"
                  >
                    <Icon className="h-4 w-4" />
                  </button>
                ))}
              </div>
              <div className="ml-1 flex items-center gap-0.5 border-l border-line pl-1 dark:border-line-dark">
                <button
                  onMouseDown={(e) => {
                    e.preventDefault();
                    applyCommand("undo");
                  }}
                  className="rounded-md p-1.5 text-muted transition-colors hover:bg-surface-soft hover:text-ink dark:hover:bg-surface-dark dark:hover:text-[#e8efe9]"
                  aria-label="Undo"
                >
                  <Undo2 className="h-4 w-4" />
                </button>
                <button
                  onMouseDown={(e) => {
                    e.preventDefault();
                    applyCommand("redo");
                  }}
                  className="rounded-md p-1.5 text-muted transition-colors hover:bg-surface-soft hover:text-ink dark:hover:bg-surface-dark dark:hover:text-[#e8efe9]"
                  aria-label="Redo"
                >
                  <Redo2 className="h-4 w-4" />
                </button>
              </div>
              <div className="ml-auto flex items-center gap-3">
                <label className="flex items-center gap-1.5 text-[11px] text-muted">
                  Project
                  <Select
                    value={projectId}
                    onValueChange={(v) => {
                      setProjectId(v);
                      useStore
                        .getState()
                        .updateNote(active.id, {
                          project_id: v === "none" ? null : v,
                        });
                    }}
                  >
                    <SelectTrigger className="w-36 py-1 text-[12px]">
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
                </label>
                <label className="flex items-center gap-1.5 text-[11px] text-muted">
                  Task
                  <Select
                    value={taskId}
                    onValueChange={(v) => {
                      setTaskId(v);
                      useStore
                        .getState()
                        .updateNote(active.id, {
                          task_id: v === "none" ? null : v,
                        });
                    }}
                  >
                    <SelectTrigger className="w-36 py-1 text-[12px]">
                      <SelectValue placeholder="Task" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">None</SelectItem>
                      {tasks.map((t) => (
                        <SelectItem key={t.id} value={t.id}>
                          {t.title.slice(0, 30)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </label>
                <span className="text-[10px] text-faint">
                  Rich text
                </span>
              </div>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">
              <div
                ref={editorRef}
                contentEditable
                suppressContentEditableWarning
                onInput={() => {
                  if (editorRef.current) saveContent(editorRef.current.innerHTML);
                }}
                onKeyDown={handleKeyDown}
                data-placeholder="Write something…"
                className="note-editor h-full min-h-[300px] w-full text-[14px] leading-relaxed"
              />
            </div>
          </>
        )}
      </div>

      <ConfirmDialog
        open={confirmDelete}
        title="Delete note"
        message={`Delete "${active?.title || "Untitled"}"? This cannot be undone.`}
        onConfirm={() => {
          if (active) {
            useStore.getState().deleteNote(active.id);
            navigate("notes", {});
          }
          setConfirmDelete(false);
        }}
        onCancel={() => setConfirmDelete(false)}
      />
    </div>
  );
}