import { create } from "zustand";
import { marked } from "marked";
import {
  isPermissionGranted,
  sendNotification,
} from "@tauri-apps/plugin-notification";
import {
  dbExecute,
  dbSelect,
  loadAllSettings,
  newId,
  now,
  saveSettings,
} from "./db";
import {
  HOUR_MS,
  MINUTE_MS,
  addDays,
  endOfDay,
  isOverdue,
  startOfDay,
  startOfWeek,
} from "./utils";
import type {
  Event,
  ExportPayload,
  NotifSettings,
  Note,
  Priority,
  Project,
  Subtask,
  Task,
  TaskStatus,
  ThemeSetting,
} from "./types";

export type PageName =
  | "home"
  | "tasks"
  | "notes"
  | "kanban"
  | "calendar"
  | "projects"
  | "project"
  | "settings";

export interface NavParams {
  taskId?: string;
  projectId?: string;
  noteId?: string;
  eventId?: string;
}

export type TaskWithExtras = Task & { subtasks: Subtask[]; dependencies: string[] };

export interface Toast {
  id: number;
  message: string;
  type: "info" | "success" | "error";
}

interface PersistedState {
  theme: ThemeSetting;
  notif: NotifSettings;
  notified: Record<string, number>;
  ui: Record<string, string | number>;
}

interface StoreState extends PersistedState {
  loaded: boolean;
  projects: Project[];
  tasks: TaskWithExtras[];
  notes: Note[];
  events: Event[];

  page: PageName;
  params: NavParams;
  searchOpen: boolean;
  toasts: Toast[];

  loadAll: () => Promise<void>;
  navigate: (page: PageName, params?: NavParams) => void;
  openTask: (id: string) => void;
  closeTask: () => void;
  setSearchOpen: (open: boolean) => void;
  setTheme: (theme: ThemeSetting) => void;
  setNotif: (patch: Partial<NotifSettings>) => void;
  setUi: (patch: Record<string, string | number>) => void;
  toast: (message: string, type?: Toast["type"]) => void;
  dismissToast: (id: number) => void;
  markNotified: (key: string) => void;
  pruneNotified: () => void;

  // tasks
  createTask: (input: {
    title: string;
    project_id?: string | null;
    status?: TaskStatus;
    priority?: Priority;
    scheduled_start?: number | null;
    scheduled_end?: number | null;
    due_at?: number | null;
    skip_default_times?: boolean;
  }) => Promise<string>;
  updateTask: (id: string, patch: Partial<Task>) => Promise<void>;
  deleteTask: (id: string) => Promise<void>;
  duplicateTask: (id: string) => Promise<string | null>;
  addSubtask: (taskId: string, title: string) => Promise<void>;
  toggleSubtask: (taskId: string, subtaskId: string) => Promise<void>;
  removeSubtask: (taskId: string, subtaskId: string) => Promise<void>;
  setDependencies: (taskId: string, deps: string[]) => Promise<void>;

  // projects
  createProject: (input: { name: string; description?: string }) => Promise<string>;
  updateProject: (id: string, patch: Partial<Project>) => Promise<void>;
  deleteProject: (id: string) => Promise<void>;

  // notes
  createNote: (input: {
    title?: string;
    content?: string;
    project_id?: string | null;
    task_id?: string | null;
  }) => Promise<string>;
  updateNote: (id: string, patch: Partial<Note>) => Promise<void>;
  deleteNote: (id: string) => Promise<void>;

  // events
  createEvent: (input: {
    title: string;
    start_at: number;
    end_at: number;
    project_id?: string | null;
  }) => Promise<string>;
  updateEvent: (id: string, patch: Partial<Event>) => Promise<void>;
  deleteEvent: (id: string) => Promise<void>;

  importPayload: (payload: ExportPayload) => Promise<void>;
}

const DEFAULT_NOTIF: NotifSettings = {
  enabled: true,
  remindMinutes: 30,
  taskScheduled: true,
  taskDue: true,
  taskOverdue: true,
  events: true,
};

const RESTORABLE_PAGES: PageName[] = [
  "home",
  "tasks",
  "notes",
  "kanban",
  "calendar",
  "projects",
  "settings",
];

function persistPatch(patch: Partial<PersistedState>): Promise<void> {
  const entries = (Object.entries(patch) as Array<[keyof PersistedState, unknown]>).map(
    ([key, value]) => ({ key, value: JSON.stringify(value) })
  );
  return saveSettings(entries).catch(() => {
    /* persistence is best-effort */
  });
}

let uiTimer: ReturnType<typeof setTimeout> | null = null;
function persistUi(ui: Record<string, string | number>) {
  if (uiTimer) clearTimeout(uiTimer);
  uiTimer = setTimeout(() => persistPatch({ ui }), 250);
}

function readLegacySettings(): Partial<PersistedState> | null {
  try {
    const raw = localStorage.getItem("orbit-settings");
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    const st = parsed?.state;
    if (!st || typeof st !== "object") return null;
    return {
      theme: (st.theme as ThemeSetting) ?? "system",
      notif: { ...DEFAULT_NOTIF, ...(st.notif ?? {}) },
      notified: (st.notified as Record<string, number>) ?? {},
    };
  } catch {
    return null;
  }
}

async function readPersistedState(): Promise<PersistedState> {
  const rows = await loadAllSettings();
  const parse = <T>(v: string | undefined, fb: T): T => {
    if (!v) return fb;
    try {
      return JSON.parse(v) as T;
    } catch {
      return fb;
    }
  };
  const persisted: PersistedState = {
    theme: parse<ThemeSetting>(rows.theme, "system"),
    notif: parse<NotifSettings>(rows.notif, DEFAULT_NOTIF),
    notified: parse<Record<string, number>>(rows.notified, {}),
    ui: parse<Record<string, string | number>>(rows.ui, {}),
  };
  if (!rows.theme) {
    const legacy = readLegacySettings();
    if (legacy) {
      const merged: PersistedState = {
        theme: legacy.theme ?? persisted.theme,
        notif: legacy.notif ?? persisted.notif,
        notified: legacy.notified ?? persisted.notified,
        ui: persisted.ui,
      };
      persistPatch(merged);
      return merged;
    }
  }
  return persisted;
}

async function migrateNoteContent(notes: Note[]): Promise<Note[]> {
  const needs = notes.filter(
    (n) => n.content.length > 0 && !n.content.includes("<")
  );
  if (needs.length === 0) return notes;
  const migrated: Note[] = [];
  for (const n of needs) {
    try {
      migrated.push({
        ...n,
        content: marked.parse(n.content, { async: false }) as string,
      });
    } catch {
      // leave note as-is if markdown parsing fails
    }
  }
  for (const m of migrated) {
    await dbExecute("UPDATE notes SET content = ?, updated_at = ? WHERE id = ?", [
      m.content,
      m.updated_at,
      m.id,
    ]);
  }
  const byId = new Map(migrated.map((m) => [m.id, m]));
  return notes.map((n) => byId.get(n.id) ?? n);
}

function patchTaskIn(
  tasks: TaskWithExtras[],
  id: string,
  patch: Partial<Task>
): TaskWithExtras[] {
  return tasks.map((t) =>
    t.id === id ? { ...t, ...patch, updated_at: now() } : t
  );
}

export const useStore = create<StoreState>()((set, get) => ({
      loaded: false,
      projects: [],
      tasks: [],
      notes: [],
      events: [],
      theme: "system",
      notif: DEFAULT_NOTIF,
      notified: {},
      ui: {},
      page: "home",
      params: {},
      searchOpen: false,
      toasts: [],

      loadAll: async () => {
        const persisted = await readPersistedState();
        set({
          theme: persisted.theme,
          notif: persisted.notif,
          notified: persisted.notified,
          ui: persisted.ui,
        });
        applyTheme(persisted.theme);

        const [projects, tasks, subtasks, deps, notes, events] =
          await Promise.all([
            dbSelect<Project>("SELECT * FROM projects ORDER BY created_at ASC"),
            dbSelect<Task>("SELECT * FROM tasks ORDER BY created_at ASC"),
            dbSelect<Subtask>("SELECT * FROM subtasks ORDER BY created_at ASC"),
            dbSelect<{ task_id: string; depends_on_task_id: string }>(
              "SELECT * FROM task_dependencies"
            ),
            dbSelect<Note>("SELECT * FROM notes ORDER BY updated_at DESC"),
            dbSelect<Event>("SELECT * FROM events ORDER BY start_at ASC"),
          ]);

        const migratedNotes = await migrateNoteContent(notes);

        const subtaskMap = new Map<string, Subtask[]>();
        for (const s of subtasks) {
          const list = subtaskMap.get(s.task_id) ?? [];
          list.push(s);
          subtaskMap.set(s.task_id, list);
        }
        const depMap = new Map<string, string[]>();
        for (const d of deps) {
          const list = depMap.get(d.task_id) ?? [];
          list.push(d.depends_on_task_id);
          depMap.set(d.task_id, list);
        }

        const backfilled = defaultTaskTimes();
        const backfillTasks = tasks.map((task) =>
          task.scheduled_start == null && task.scheduled_end == null
            ? { ...task, scheduled_start: backfilled.start, scheduled_end: backfilled.end }
            : task
        );
        if (tasks.some((task) => task.scheduled_start == null && task.scheduled_end == null)) {
          await dbExecute(
            "UPDATE tasks SET scheduled_start = ?, scheduled_end = ? WHERE scheduled_start IS NULL AND scheduled_end IS NULL",
            [backfilled.start, backfilled.end]
          );
        }

        const ui = get().ui;
        let page: PageName = "home";
        let params: NavParams = {};
        const lastPage = ui.lastPage as PageName | undefined;
        if (lastPage && (RESTORABLE_PAGES as string[]).includes(lastPage)) {
          page = lastPage;
        } else if (lastPage === "project") {
          const pid =
            typeof ui.lastProjectId === "string" ? ui.lastProjectId : null;
          if (pid && projects.some((p) => p.id === pid)) {
            page = "project";
            params = { projectId: pid };
          }
        }

        set({
          projects,
          notes: migratedNotes,
          events,
          tasks: backfillTasks.map((t) => ({
            ...t,
            subtasks: subtaskMap.get(t.id) ?? [],
            dependencies: depMap.get(t.id) ?? [],
          })),
          page,
          params,
          loaded: true,
        });
        get().pruneNotified();
        await moveOverdueToBacklog();
      },

      navigate: (page, params = {}) => {
        window.__orbitDiag?.("nav: -> " + page + " " + JSON.stringify(params));
        set({ page, params, searchOpen: false });
        get().setUi({
          lastPage: page,
          lastProjectId: params.projectId ?? "",
        });
      },
      openTask: (id) =>
        set((s) => ({ params: { ...s.params, taskId: id }, searchOpen: false })),
      closeTask: () =>
        set((s) => {
          const params = { ...s.params };
          delete params.taskId;
          return { params };
        }),
      setSearchOpen: (searchOpen) => set({ searchOpen }),
      setTheme: (theme) => {
        set({ theme });
        applyTheme(theme);
        persistPatch({ theme });
      },
      setNotif: (patch) => {
        const notif = { ...get().notif, ...patch };
        set({ notif });
        persistPatch({ notif });
      },
      setUi: (patch) => {
        const current = get().ui;
        if (Object.keys(patch).every((k) => current[k] === patch[k])) return;
        const ui = { ...current, ...patch };
        set({ ui });
        persistUi(ui);
      },
      toast: (message, type = "info") => {
        const id = Date.now() + Math.random();
        set({ toasts: [...get().toasts, { id, message, type }] });
        setTimeout(() => get().dismissToast(id), 3200);
      },
      dismissToast: (id) =>
        set({ toasts: get().toasts.filter((t) => t.id !== id) }),
      markNotified: (key) => {
        const notified = { ...get().notified };
        notified[key] = now();
        set({ notified });
        persistPatch({ notified });
      },
      pruneNotified: () => {
        const cutoff = now() - 7 * 86400000;
        const notified = { ...get().notified };
        for (const k of Object.keys(notified)) {
          if (notified[k] < cutoff) delete notified[k];
        }
        set({ notified });
        persistPatch({ notified });
      },

      createTask: async (input) => {
        const id = newId();
        const t = now();
        const times =
          input.scheduled_start != null || input.scheduled_end != null
            ? {
                start: input.scheduled_start ?? null,
                end: input.scheduled_end ?? null,
              }
            : input.skip_default_times
              ? { start: null, end: null }
              : defaultTaskTimes();
        const task: TaskWithExtras = {
          id,
          title: input.title,
          description: "",
          status: input.status ?? "todo",
          priority: input.priority ?? "medium",
          due_at: input.due_at ?? null,
          scheduled_start: times.start,
          scheduled_end: times.end,
          estimated_duration: null,
          project_id: input.project_id ?? null,
          created_at: t,
          updated_at: t,
          subtasks: [],
          dependencies: [],
        };
        set({ tasks: [...get().tasks, task] });
        void dbExecute(
          `INSERT INTO tasks (id, title, description, status, priority, project_id, scheduled_start, scheduled_end, due_at, created_at, updated_at)
           VALUES (?,?,?,?,?,?,?,?,?,?,?)`,
          [
            id,
            input.title,
            "",
            input.status ?? "todo",
            input.priority ?? "medium",
            input.project_id ?? null,
            times.start,
            times.end,
            input.due_at ?? null,
            t,
            t,
          ]
        ).catch(() => {});
        return id;
      },

      updateTask: async (id, patch) => {
        const allowed: (keyof Task)[] = [
          "title",
          "description",
          "status",
          "priority",
          "due_at",
          "scheduled_start",
          "scheduled_end",
          "estimated_duration",
          "project_id",
        ];
        const cols = allowed.filter((k) => k in patch);
        if (cols.length === 0) return;
        set({ tasks: patchTaskIn(get().tasks, id, patch) });
        const sets = cols.map((c) => `${c} = ?`).join(", ");
        const vals = cols.map((c) =>
          patch[c as keyof Task] === undefined ? null : patch[c as keyof Task]
        ) as unknown[];
        void dbExecute(
          `UPDATE tasks SET ${sets}, updated_at = ? WHERE id = ?`,
          [...vals, now(), id]
        ).catch(() => {});
      },

      deleteTask: async (id) => {
        set({
          tasks: get().tasks.filter((t) => t.id !== id),
          notes: get().notes.map((n) =>
            n.task_id === id ? { ...n, task_id: null } : n
          ),
        });
        void dbExecute("DELETE FROM tasks WHERE id = ?", [id]).catch(() => {});
      },

      duplicateTask: async (id) => {
        const src = get().tasks.find((t) => t.id === id);
        if (!src) return null;
        const newIdStr = newId();
        const t = now();
        const times =
          src.scheduled_start != null || src.scheduled_end != null
            ? { start: src.scheduled_start, end: src.scheduled_end }
            : defaultTaskTimes();
        const task: TaskWithExtras = {
          ...src,
          id: newIdStr,
          scheduled_start: times.start,
          scheduled_end: times.end,
          created_at: t,
          updated_at: t,
          subtasks: src.subtasks.map((s) => ({ ...s, id: newId(), task_id: newIdStr })),
          dependencies: [],
        };
        set({ tasks: [...get().tasks, task] });
        void dbExecute(
          `INSERT INTO tasks (id, title, description, status, priority, project_id, scheduled_start, scheduled_end, due_at, estimated_duration, created_at, updated_at)
           VALUES (?,?,?,?,?,?,?,?,?,?,?,?)`,
          [
            newIdStr,
            src.title,
            src.description,
            src.status,
            src.priority,
            src.project_id,
            times.start,
            times.end,
            src.due_at,
            src.estimated_duration,
            t,
            t,
          ]
        ).catch(() => {});
        for (const s of src.subtasks) {
          void dbExecute(
            `INSERT INTO subtasks (id, task_id, title, completed, created_at) VALUES (?,?,?,?,?)`,
            [newId(), newIdStr, s.title, s.completed ? 1 : 0, t]
          ).catch(() => {});
        }
        return newIdStr;
      },

      addSubtask: async (taskId, title) => {
        const id = newId();
        const t = now();
        set({
          tasks: get().tasks.map((task) =>
            task.id === taskId
              ? {
                  ...task,
                  updated_at: t,
                  subtasks: [
                    ...task.subtasks,
                    { id, task_id: taskId, title, completed: false, created_at: t },
                  ],
                }
              : task
          ),
        });
        void dbExecute(
          "INSERT INTO subtasks (id, task_id, title, completed, created_at) VALUES (?,?,?,0,?)",
          [id, taskId, title, t]
        ).catch(() => {});
      },

      toggleSubtask: async (taskId, subtaskId) => {
        const task = get().tasks.find((t) => t.id === taskId);
        const sub = task?.subtasks.find((s) => s.id === subtaskId);
        if (!task || !sub) return;
        const completed = !sub.completed;
        set({
          tasks: get().tasks.map((t) =>
            t.id === taskId
              ? {
                  ...t,
                  updated_at: now(),
                  subtasks: t.subtasks.map((s) =>
                    s.id === subtaskId ? { ...s, completed } : s
                  ),
                }
              : t
          ),
        });
        void dbExecute(
          "UPDATE subtasks SET completed = ? WHERE id = ?",
          [completed ? 1 : 0, subtaskId]
        ).catch(() => {});
      },

      removeSubtask: async (taskId, subtaskId) => {
        set({
          tasks: get().tasks.map((t) =>
            t.id === taskId
              ? {
                  ...t,
                  updated_at: now(),
                  subtasks: t.subtasks.filter((s) => s.id !== subtaskId),
                }
              : t
          ),
        });
        void dbExecute("DELETE FROM subtasks WHERE id = ?", [subtaskId]).catch(() => {});
      },

      setDependencies: async (taskId, deps) => {
        set({
          tasks: get().tasks.map((t) =>
            t.id === taskId ? { ...t, dependencies: deps.filter((d) => d !== taskId) } : t
          ),
        });
        void dbExecute("DELETE FROM task_dependencies WHERE task_id = ?", [taskId]).catch(() => {});
        for (const dep of deps) {
          if (dep === taskId) continue;
          void dbExecute(
            "INSERT OR IGNORE INTO task_dependencies (task_id, depends_on_task_id) VALUES (?,?)",
            [taskId, dep]
          ).catch(() => {});
        }
      },

      createProject: async (input) => {
        const id = newId();
        const t = now();
        const project: Project = {
          id,
          name: input.name,
          description: input.description ?? "",
          color: null,
          status: "active",
          created_at: t,
          updated_at: t,
        };
        set({ projects: [...get().projects, project] });
        void dbExecute(
          "INSERT INTO projects (id, name, description, status, created_at, updated_at) VALUES (?,?,?,'active',?,?)",
          [id, input.name, input.description ?? "", t, t]
        ).catch(() => {});
        return id;
      },

      updateProject: async (id, patch) => {
        const allowed: (keyof Project)[] = ["name", "description", "color", "status"];
        const cols = allowed.filter((k) => k in patch);
        if (cols.length === 0) return;
        set({
          projects: get().projects.map((p) =>
            p.id === id ? { ...p, ...patch, updated_at: now() } : p
          ),
        });
        const sets = cols.map((c) => `${c} = ?`).join(", ");
        const vals = cols.map((c) => patch[c as keyof Project]) as unknown[];
        void dbExecute(
          `UPDATE projects SET ${sets}, updated_at = ? WHERE id = ?`,
          [...vals, now(), id]
        ).catch(() => {});
      },

      deleteProject: async (id) => {
        set({
          projects: get().projects.filter((p) => p.id !== id),
          tasks: get().tasks.map((t) =>
            t.project_id === id ? { ...t, project_id: null, updated_at: now() } : t
          ),
          notes: get().notes.map((n) =>
            n.project_id === id ? { ...n, project_id: null } : n
          ),
          events: get().events.map((e) =>
            e.project_id === id ? { ...e, project_id: null } : e
          ),
        });
        void dbExecute("DELETE FROM projects WHERE id = ?", [id]).catch(() => {});
      },

      createNote: async (input) => {
        const id = newId();
        const t = now();
        const note: Note = {
          id,
          title: input.title ?? "",
          content: input.content ?? "",
          project_id: input.project_id ?? null,
          task_id: input.task_id ?? null,
          created_at: t,
          updated_at: t,
        };
        set({ notes: [note, ...get().notes] });
        void dbExecute(
          "INSERT INTO notes (id, title, content, project_id, task_id, created_at, updated_at) VALUES (?,?,?,?,?,?,?)",
          [id, input.title ?? "", input.content ?? "", input.project_id ?? null, input.task_id ?? null, t, t]
        ).catch(() => {});
        return id;
      },

      updateNote: async (id, patch) => {
        const allowed: (keyof Note)[] = ["title", "content", "project_id", "task_id"];
        const cols = allowed.filter((k) => k in patch);
        if (cols.length === 0) return;
        set({
          notes: get()
            .notes.map((n) => (n.id === id ? { ...n, ...patch, updated_at: now() } : n))
            .sort((a, b) => b.updated_at - a.updated_at),
        });
        const sets = cols.map((c) => `${c} = ?`).join(", ");
        const vals = cols.map((c) => patch[c as keyof Note]) as unknown[];
        void dbExecute(
          `UPDATE notes SET ${sets}, updated_at = ? WHERE id = ?`,
          [...vals, now(), id]
        ).catch(() => {});
      },

      deleteNote: async (id) => {
        set({ notes: get().notes.filter((n) => n.id !== id) });
        void dbExecute("DELETE FROM notes WHERE id = ?", [id]).catch(() => {});
      },

      createEvent: async (input) => {
        const id = newId();
        const t = now();
        const ev: Event = {
          id,
          title: input.title,
          description: "",
          start_at: input.start_at,
          end_at: input.end_at,
          project_id: input.project_id ?? null,
          created_at: t,
          updated_at: t,
        };
        set({ events: [...get().events, ev].sort((a, b) => a.start_at - b.start_at) });
        void dbExecute(
          "INSERT INTO events (id, title, description, start_at, end_at, project_id, created_at, updated_at) VALUES (?,?,?,?,?,?,?,?)",
          [id, input.title, "", input.start_at, input.end_at, input.project_id ?? null, t, t]
        ).catch(() => {});
        return id;
      },

      updateEvent: async (id, patch) => {
        const allowed: (keyof Event)[] = ["title", "description", "start_at", "end_at", "project_id"];
        const cols = allowed.filter((k) => k in patch);
        if (cols.length === 0) return;
        set({
          events: get()
            .events.map((e) => (e.id === id ? { ...e, ...patch, updated_at: now() } : e))
            .sort((a, b) => a.start_at - b.start_at),
        });
        const sets = cols.map((c) => `${c} = ?`).join(", ");
        const vals = cols.map((c) => patch[c as keyof Event]) as unknown[];
        void dbExecute(
          `UPDATE events SET ${sets}, updated_at = ? WHERE id = ?`,
          [...vals, now(), id]
        ).catch(() => {});
      },

      deleteEvent: async (id) => {
        set({ events: get().events.filter((e) => e.id !== id) });
        void dbExecute("DELETE FROM events WHERE id = ?", [id]).catch(() => {});
      },

      importPayload: async (payload) => {
        for (const p of payload.projects ?? []) {
          await dbExecute(
            `INSERT OR REPLACE INTO projects (id, name, description, color, status, created_at, updated_at) VALUES (?,?,?,?,?,?,?)`,
            [p.id, p.name, p.description ?? "", p.color ?? null, p.status ?? "active", p.created_at, p.updated_at]
          );
        }
        for (const t of payload.tasks ?? []) {
          await dbExecute(
            `INSERT OR REPLACE INTO tasks (id, title, description, status, priority, due_at, scheduled_start, scheduled_end, estimated_duration, project_id, created_at, updated_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?)`,
            [
              t.id, t.title, t.description ?? "", t.status ?? "todo", t.priority ?? "medium",
              t.due_at ?? null, t.scheduled_start ?? null, t.scheduled_end ?? null,
              t.estimated_duration ?? null, t.project_id ?? null, t.created_at, t.updated_at,
            ]
          );
        }
        for (const s of payload.subtasks ?? []) {
          await dbExecute(
            `INSERT OR REPLACE INTO subtasks (id, task_id, title, completed, created_at) VALUES (?,?,?,?,?)`,
            [s.id, s.task_id, s.title, s.completed ? 1 : 0, s.created_at]
          );
        }
        for (const n of payload.notes ?? []) {
          await dbExecute(
            `INSERT OR REPLACE INTO notes (id, title, content, project_id, task_id, created_at, updated_at) VALUES (?,?,?,?,?,?,?)`,
            [n.id, n.title, n.content ?? "", n.project_id ?? null, n.task_id ?? null, n.created_at, n.updated_at]
          );
        }
        for (const e of payload.events ?? []) {
          await dbExecute(
            `INSERT OR REPLACE INTO events (id, title, description, start_at, end_at, project_id, created_at, updated_at) VALUES (?,?,?,?,?,?,?,?)`,
            [e.id, e.title, e.description ?? "", e.start_at, e.end_at, e.project_id ?? null, e.created_at, e.updated_at]
          );
        }
        for (const d of payload.task_dependencies ?? []) {
          await dbExecute(
            `INSERT OR REPLACE INTO task_dependencies (task_id, depends_on_task_id) VALUES (?,?)`,
            [d.task_id, d.depends_on_task_id]
          );
        }
        const s = payload.settings;
        if (s && typeof s === "object") {
          const imported = s as unknown as Partial<PersistedState>;
          const setImported = (patch: Partial<PersistedState>) => {
            if (patch.theme) set({ theme: patch.theme });
            if (patch.notif) set({ notif: { ...DEFAULT_NOTIF, ...patch.notif } });
            if (patch.notified) set({ notified: patch.notified });
            if (patch.ui) set({ ui: { ...patch.ui } });
          };
          setImported({
            theme: imported.theme,
            notif: imported.notif,
            notified: imported.notified,
            ui: imported.ui,
          });
          await persistPatch({
            theme: get().theme,
            notif: get().notif,
            notified: get().notified,
            ui: get().ui,
          });
        }
        await get().loadAll();
      },
    })
);

export function applyTheme(theme: ThemeSetting) {
  const root = document.documentElement;
  if (theme === "system") {
    const dark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    root.classList.toggle("dark", dark);
  } else {
    root.classList.toggle("dark", theme === "dark");
  }
}

export async function moveOverdueToBacklog() {
  const { tasks } = useStore.getState();
  const targets = tasks.filter((t) => t.status === "todo" && isOverdue(t));
  if (targets.length === 0) return;
  const ids = targets.map((t) => t.id);
  const ts = now();
  const placeholders = ids.map(() => "?").join(", ");
  await dbExecute(
    `UPDATE tasks SET status = 'backlog', updated_at = ? WHERE id IN (${placeholders})`,
    [ts, ...ids]
  );
  const idSet = new Set(ids);
  useStore.setState({
    tasks: useStore.getState().tasks.map((t) =>
      idSet.has(t.id) ? { ...t, status: "backlog", updated_at: ts } : t
    ),
  });
}

export function tickNotifications() {
  void moveOverdueToBacklog();
  const { notif, tasks, events, notified, markNotified } = useStore.getState();
  if (!notif.enabled) return;
  const nowTs = now();
  const windowMs = notif.remindMinutes * MINUTE_MS;

  const fire = async (key: string, title: string, body: string) => {
    if (notified[key]) return;
    try {
      const granted = await isPermissionGranted();
      if (granted) {
        sendNotification({ title, body });
      }
    } catch {
      /* not running inside Tauri */
    }
    markNotified(key);
  };

  for (const task of tasks) {
    if (task.status === "done") continue;
    if (notif.taskScheduled && task.scheduled_start && task.scheduled_start > nowTs && task.scheduled_start - nowTs <= windowMs) {
      void fire(`task-sched:${task.id}:${task.scheduled_start}`, "Upcoming task", `"${task.title}" starts soon`);
    }
    if (notif.taskDue && task.due_at && task.due_at > nowTs && task.due_at - nowTs <= windowMs) {
      void fire(`task-due:${task.id}:${task.due_at}`, "Task due soon", `"${task.title}" is due`);
    }
    if (notif.taskOverdue && task.due_at && task.due_at < nowTs) {
      void fire(`task-overdue:${task.id}`, "Overdue task", `"${task.title}" is overdue`);
    }
  }

  for (const ev of events) {
    if (notif.events && ev.start_at > nowTs && ev.start_at - nowTs <= windowMs) {
      void fire(`event:${ev.id}:${ev.start_at}`, "Upcoming event", `"${ev.title}" starts soon`);
    }
  }
}

export interface Range {
  start: number;
  end: number;
}

export function todayRange(): Range {
  return { start: startOfDay(new Date()).getTime(), end: endOfDay(new Date()).getTime() };
}

export function weekRange(): Range {
  const s = startOfWeek(new Date());
  return { start: s.getTime(), end: addDays(s, 7).getTime() - 1 };
}

export function monthRange(): Range {
  const d = new Date();
  const s = new Date(d.getFullYear(), d.getMonth(), 1);
  const e = new Date(d.getFullYear(), d.getMonth() + 1, 1);
  return { start: s.getTime(), end: e.getTime() - 1 };
}

export function hoursFromMinutes(minutes: number): number {
  return minutes / 60;
}

export function defaultTaskTimes(): { start: number; end: number } {
  const d = new Date();
  d.setHours(9, 0, 0, 0);
  const start = d.getTime();
  return { start, end: start + 2 * HOUR_MS };
}
