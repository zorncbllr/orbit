import { useEffect, useMemo, useRef, useState } from "react";
import { marked } from "marked";
import {
  Bold,
  Eye,
  FilePlus2,
  Heading2,
  Italic,
  List,
  ListOrdered,
  NotebookPen,
  Quote,
  Search,
  Trash2,
} from "lucide-react";
import { useStore } from "../lib/store";
import { cn, relativeTime } from "../lib/utils";
import { ConfirmDialog, EmptyState } from "../components/ui";

const toolbars = [
  { icon: Heading2, token: "## " },
  { icon: Bold, token: "**", wrap: true },
  { icon: Italic, token: "*", wrap: true },
  { icon: List, token: "- " },
  { icon: ListOrdered, token: "1. " },
  { icon: Quote, token: "> " },
];

export default function NotesPage() {
  const notes = useStore((s) => s.notes);
  const projects = useStore((s) => s.projects);
  const tasks = useStore((s) => s.tasks);
  const navigate = useStore((s) => s.navigate);
  const noteId = useStore((s) => s.params.noteId);

  const [query, setQuery] = useState("");
  const [editorTitle, setEditorTitle] = useState("");
  const [content, setContent] = useState("");
  const [preview, setPreview] = useState(false);
  const [projectId, setProjectId] = useState<string>("none");
  const [taskId, setTaskId] = useState<string>("none");
  const [confirmDelete, setConfirmDelete] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const activeId = noteId ?? notes[0]?.id;

  const active = useMemo(
    () => notes.find((n) => n.id === activeId) ?? null,
    [notes, activeId]
  );

  useEffect(() => {
    setEditorTitle(active?.title ?? "");
    setContent(active?.content ?? "");
    setProjectId(active?.project_id ?? "none");
    setTaskId(active?.task_id ?? "none");
    setPreview(false);
  }, [activeId, active?.updated_at]); // eslint-disable-line react-hooks/exhaustive-deps

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    let list = notes;
    if (q) {
      list = list.filter(
        (n) =>
          n.title.toLowerCase().includes(q) ||
          n.content.toLowerCase().includes(q)
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
    setContent(c);
    if (active) useStore.getState().updateNote(active.id, { content: c });
  };

  const applyToken = (token: string, wrap = false) => {
    const el = textareaRef.current;
    if (!el) return;
    const { selectionStart: start, selectionEnd: end } = el;
    const selected = content.slice(start, end);
    const next = wrap
      ? `${token}${selected}${token}`
      : selected
        ? `${token}${selected}\n`
        : token;
    const nextContent = content.slice(0, start) + next + content.slice(end);
    saveContent(nextContent);
    requestAnimationFrame(() => {
      el.focus();
      const pos = wrap ? start + token.length : start + next.length;
      el.setSelectionRange(pos, pos + selected.length);
    });
  };

  const previewHtml = useMemo(() => {
    try {
      return marked.parse(content, { async: false }) as string;
    } catch {
      return content;
    }
  }, [content]);

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
                onClick={() => setPreview((p) => !p)}
                className={cn("btn", preview ? "btn-primary" : "btn-ghost")}
              >
                <Eye className="h-4 w-4" /> Preview
              </button>
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
                {toolbars.map(({ icon: Icon, token, wrap }) => (
                  <button
                    key={token}
                    onMouseDown={(e) => {
                      e.preventDefault();
                      applyToken(token, wrap);
                    }}
                    className="rounded-md p-1.5 text-muted transition-colors hover:bg-surface-soft hover:text-ink dark:hover:bg-surface-dark dark:hover:text-[#e8efe9]"
                    aria-label={`Insert ${token.trim() || "format"}`}
                  >
                    <Icon className="h-4 w-4" />
                  </button>
                ))}
              </div>
              <div className="ml-auto flex items-center gap-3">
                <label className="flex items-center gap-1.5 text-[11px] text-muted">
                  Project
                  <select
                    value={projectId}
                    onChange={(e) => {
                      setProjectId(e.target.value);
                      useStore
                        .getState()
                        .updateNote(active.id, {
                          project_id: e.target.value === "none" ? null : e.target.value,
                        });
                    }}
                    className="input w-36 py-1 text-[12px]"
                  >
                    <option value="none">None</option>
                    {projects.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="flex items-center gap-1.5 text-[11px] text-muted">
                  Task
                  <select
                    value={taskId}
                    onChange={(e) => {
                      setTaskId(e.target.value);
                      useStore
                        .getState()
                        .updateNote(active.id, {
                          task_id: e.target.value === "none" ? null : e.target.value,
                        });
                    }}
                    className="input w-36 py-1 text-[12px]"
                  >
                    <option value="none">None</option>
                    {tasks.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.title.slice(0, 30)}
                      </option>
                    ))}
                  </select>
                </label>
                <span className="text-[10px] text-faint">
                  Markdown
                </span>
              </div>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">
              {preview ? (
                <div
                  className="markdown-preview text-[14px] leading-relaxed"
                  dangerouslySetInnerHTML={{ __html: previewHtml }}
                />
              ) : (
                <textarea
                  ref={textareaRef}
                  value={content}
                  onChange={(e) => saveContent(e.target.value)}
                  placeholder="Write something…"
                  className="h-full min-h-[300px] w-full resize-none bg-transparent text-[14px] leading-relaxed text-ink placeholder:text-faint focus:outline-none dark:text-[#e8efe9]"
                />
              )}
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