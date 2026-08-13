import { useState } from "react";
import { FolderKanban, FolderPlus, MoreHorizontal, Pencil, Trash2 } from "lucide-react";
import { useStore } from "../lib/store";
import { projectColor } from "../lib/utils";
import { EmptyState, Modal, ProgressBar } from "../components/ui";

export default function ProjectsPage() {
  const projects = useStore((s) => s.projects);
  const tasks = useStore((s) => s.tasks);
  const navigate = useStore((s) => s.navigate);
  const createProject = useStore((s) => s.createProject);
  const updateProject = useStore((s) => s.updateProject);
  const deleteProject = useStore((s) => s.deleteProject);
  const toast = useStore((s) => s.toast);

  const [modal, setModal] = useState<
    | { mode: "create" }
    | { mode: "edit"; id: string; name: string; description: string }
    | null
  >(null);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [menuId, setMenuId] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

  const stats = (id: string) => {
    const pts = tasks.filter((t) => t.project_id === id);
    const done = pts.filter((t) => t.status === "done").length;
    return { total: pts.length, done, pct: pts.length === 0 ? 0 : Math.round((done / pts.length) * 100) };
  };

  const openModal = (
    m: { mode: "create" } | { mode: "edit"; id: string; name: string; description: string }
  ) => {
    setName(m.mode === "create" ? "" : m.name);
    setDescription(m.mode === "create" ? "" : m.description);
    setModal(m);
  };

  const save = async () => {
    if (!name.trim()) return;
    if (modal?.mode === "create") {
      await createProject({ name: name.trim(), description });
      toast("Project created", "success");
    } else if (modal?.mode === "edit") {
      await updateProject(modal.id, { name: name.trim(), description });
      toast("Project updated", "success");
    }
    setModal(null);
  };

  const del = async (id: string) => {
    await deleteProject(id);
    toast("Project deleted", "info");
    setConfirmDelete(null);
  };

  return (
    <div className="h-full overflow-y-auto">
      <div className="mx-auto max-w-4xl px-8 py-6">
        <header className="mb-5 flex items-center justify-between">
          <div>
            <h1 className="text-xl font-semibold tracking-tight text-ink dark:text-[#e8efe9]">
              Projects
            </h1>
            <p className="text-[13px] text-muted">
              Groups of related tasks and notes.
            </p>
          </div>
          <button className="btn btn-primary" onClick={() => openModal({ mode: "create" })}>
            <FolderPlus className="h-4 w-4" /> New Project
          </button>
        </header>

        {projects.length === 0 ? (
          <EmptyState
            icon={<FolderKanban className="h-5 w-5" />}
            title="No projects yet"
            hint="Create a project to group related tasks, notes, and schedule."
            action={
              <button className="btn btn-primary" onClick={() => openModal({ mode: "create" })}>
                <FolderPlus className="h-4 w-4" /> New Project
              </button>
            }
          />
        ) : (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {projects
              .filter((p) => p.status === "active")
              .map((p, i) => {
                const s = stats(p.id);
                return (
                  <div
                    key={p.id}
                    onClick={() => navigate("project", { projectId: p.id })}
                    className="group relative cursor-pointer rounded-xl border border-line bg-surface p-4 transition-colors hover:border-br/50 dark:border-line-dark dark:bg-surface-dark-card"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2.5">
                        <span
                          className="flex h-8 w-8 items-center justify-center rounded-lg text-white"
                          style={{ background: p.color ?? projectColor(i) }}
                        >
                          <FolderKanban className="h-4 w-4" />
                        </span>
                        <div>
                          <p className="text-[14px] font-medium text-ink dark:text-[#e8efe9]">
                            {p.name}
                          </p>
                          <p className="text-[11px] text-muted">
                            {s.done} of {s.total} tasks done
                          </p>
                        </div>
                      </div>
                      <div className="relative">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setMenuId(menuId === p.id ? null : p.id);
                          }}
                          className="rounded-md p-1 text-muted opacity-0 transition-opacity hover:bg-surface-soft hover:text-ink group-hover:opacity-100 dark:hover:bg-surface-dark"
                          aria-label="Project actions"
                        >
                          <MoreHorizontal className="h-4 w-4" />
                        </button>
                        {menuId === p.id && (
                          <div className="absolute right-0 top-8 z-10 w-36 overflow-hidden rounded-lg border border-line bg-surface shadow-lg dark:border-line-dark dark:bg-surface-dark-card">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                openModal({ mode: "edit", id: p.id, name: p.name, description: p.description });
                                setMenuId(null);
                              }}
                              className="flex w-full items-center gap-2 px-3 py-2 text-left text-[12.5px] text-ink-soft hover:bg-surface-soft dark:text-[#cfd9d2] dark:hover:bg-surface-dark"
                            >
                              <Pencil className="h-3.5 w-3.5" /> Edit
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setConfirmDelete(p.id);
                                setMenuId(null);
                              }}
                              className="flex w-full items-center gap-2 px-3 py-2 text-left text-[12.5px] text-coral hover:bg-coral/10"
                            >
                              <Trash2 className="h-3.5 w-3.5" /> Delete
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="mt-3">
                      <div className="mb-1 flex items-center justify-between">
                        <span className="text-[11px] text-faint">
                          {s.total > 0 ? "Progress from tasks" : "No tasks yet"}
                        </span>
                        <span className="text-[12px] font-medium text-br-deep dark:text-[#a7d3ba]">
                          {s.pct}%
                        </span>
                      </div>
                      <ProgressBar value={s.pct} />
                    </div>
                    {p.description && (
                      <p className="mt-2 line-clamp-1 text-[12px] text-muted">{p.description}</p>
                    )}
                  </div>
                );
              })}
          </div>
        )}
      </div>

      <Modal
        open={!!modal}
        onClose={() => setModal(null)}
        title={modal?.mode === "create" ? "New project" : "Edit project"}
      >
        <div className="space-y-3">
          <label className="block">
            <span className="mb-1 block text-[11px] font-medium uppercase tracking-wider text-faint">Name</span>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && save()}
              placeholder="Project name"
              className="input"
              autoFocus
            />
          </label>
          <label className="block">
            <span className="mb-1 block text-[11px] font-medium uppercase tracking-wider text-faint">Description</span>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
              placeholder="Optional…"
              className="input resize-none"
            />
          </label>
          <div className="flex justify-end gap-2 pt-1">
            <button className="btn btn-outline" onClick={() => setModal(null)}>Cancel</button>
            <button className="btn btn-primary" onClick={save} disabled={!name.trim()}>
              {modal?.mode === "create" ? "Create" : "Save"}
            </button>
          </div>
        </div>
      </Modal>

      <Modal
        open={!!confirmDelete}
        onClose={() => setConfirmDelete(null)}
        title="Delete project"
      >
        <p className="text-sm text-muted">
          Delete this project? Tasks, notes, and events will be kept but unlinked from the project.
        </p>
        <div className="mt-4 flex justify-end gap-2">
          <button className="btn btn-outline" onClick={() => setConfirmDelete(null)}>Cancel</button>
          <button
            className="btn text-white hover:brightness-95"
            style={{ background: "var(--color-coral)" }}
            onClick={() => confirmDelete && del(confirmDelete)}
          >
            Delete
          </button>
        </div>
      </Modal>
    </div>
  );
}