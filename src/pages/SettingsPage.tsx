import { useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { appConfigDir } from "@tauri-apps/api/path";
import { open, save } from "@tauri-apps/plugin-dialog";
import {
  isPermissionGranted,
  requestPermission,
} from "@tauri-apps/plugin-notification";
import {
  Database,
  Download,
  FileDown,
  Keyboard,
  Monitor,
  Moon,
  Palette,
  Sun,
  Upload,
} from "lucide-react";
import { useStore } from "../lib/store";
import { cn } from "../lib/utils";
import type { ExportPayload, ThemeSetting } from "../lib/types";

type Section = "general" | "appearance" | "notifications" | "shortcuts" | "data" | "about";

const SECTIONS: Array<{ id: Section; label: string }> = [
  { id: "general", label: "General" },
  { id: "appearance", label: "Appearance" },
  { id: "notifications", label: "Notifications" },
  { id: "shortcuts", label: "Keyboard Shortcuts" },
  { id: "data", label: "Data" },
  { id: "about", label: "About" },
];

const SHORTCUTS: Array<{ keys: string; action: string }> = [
  { keys: "N", action: "New task" },
  { keys: "⇧ N", action: "New note" },
  { keys: "/", action: "Search" },
  { keys: "⌘ K", action: "Toggle search" },
  { keys: "1", action: "Go to Home" },
  { keys: "2", action: "Go to Tasks" },
  { keys: "3", action: "Go to Notes" },
  { keys: "4", action: "Go to Kanban" },
  { keys: "5", action: "Go to Calendar" },
  { keys: "6", action: "Go to Projects" },
  { keys: "Esc", action: "Close dialogs" },
  { keys: "⌫", action: "Delete task / note / event" },
];

export default function SettingsPage() {
  const [section, setSection] = useState<Section>("general");
  const [busy, setBusy] = useState<string | null>(null);

  const theme = useStore((s) => s.theme);
  const setTheme = useStore((s) => s.setTheme);
  const notif = useStore((s) => s.notif);
  const setNotif = useStore((s) => s.setNotif);
  const toast = useStore((s) => s.toast);

  const set = (b: string | null) => setBusy(b);

  const exportData = async () => {
    const s = useStore.getState();
    const payload: ExportPayload = {
      app: "orbit",
      version: "0.1.0",
      exported_at: Date.now(),
      projects: s.projects,
      tasks: s.tasks.map((t) => ({
        id: t.id,
        title: t.title,
        description: t.description,
        status: t.status,
        priority: t.priority,
        due_at: t.due_at,
        scheduled_start: t.scheduled_start,
        scheduled_end: t.scheduled_end,
        estimated_duration: t.estimated_duration,
        project_id: t.project_id,
        created_at: t.created_at,
        updated_at: t.updated_at,
      })),
      subtasks: s.tasks.flatMap((t) => t.subtasks),
      notes: s.notes,
      events: s.events,
      task_dependencies: s.tasks.flatMap((t) =>
        t.dependencies.map((d) => ({ task_id: t.id, depends_on_task_id: d }))
      ),
      settings: {
        theme: s.theme,
        notif: s.notif,
        notified: s.notified,
        ui: s.ui,
      },
    };
    set("export");
    try {
      const path = await save({
        defaultPath: `orbit-backup-${new Date().toISOString().slice(0, 10)}.json`,
        filters: [{ name: "JSON", extensions: ["json"] }],
      });
      if (path) {
        await invoke("write_file", { path, contents: JSON.stringify(payload, null, 2) });
        toast("Data exported", "success");
      }
    } catch (e) {
      toast(`Export failed: ${e}`, "error");
    } finally {
      set(null);
    }
  };

  const importData = async () => {
    set("import");
    try {
      const path = await open({
        multiple: false,
        directory: false,
        filters: [{ name: "JSON", extensions: ["json"] }],
      });
      if (path) {
        const text = await invoke<string>("read_file", { path: String(path) });
        const payload = JSON.parse(text) as ExportPayload;
        if (payload.app !== "orbit") throw new Error("Not an Orbit backup file");
        await useStore.getState().importPayload(payload);
        toast("Data imported", "success");
      }
    } catch (e) {
      toast(`Import failed: ${String(e)}`, "error");
    } finally {
      set(null);
    }
  };

  const backupDb = async () => {
    set("backup");
    try {
      const dir = await appConfigDir();
      const dest = await save({
        defaultPath: `orbit-db-${new Date().toISOString().slice(0, 10)}.db`,
        filters: [{ name: "SQLite", extensions: ["db"] }],
      });
      if (dest) {
        await invoke("copy_file", { src: `${dir}orbit.db`, dest });
        toast("Database backup created", "success");
      }
    } catch (e) {
      toast(`Backup failed: ${e}`, "error");
    } finally {
      set(null);
    }
  };

  const toggleNotifications = async (enabled: boolean) => {
    setNotif({ enabled });
    if (enabled) {
      try {
        const granted = await isPermissionGranted();
        if (!granted) {
          const res = await requestPermission();
          if (res !== "granted") {
            setNotif({ enabled: false });
            toast("Notifications not permitted", "error");
            return;
          }
        }
        toast("Notifications enabled", "success");
      } catch {
        toast("Native notifications unavailable", "info");
      }
    }
  };

  return (
    <div className="h-full overflow-y-auto">
      <div className="mx-auto flex max-w-4xl gap-8 px-8 py-6">
        <div className="w-44 shrink-0">
          <h1 className="mb-3 text-xl font-semibold tracking-tight text-ink dark:text-[#e8efe9]">
            Settings
          </h1>
          <nav className="space-y-0.5">
            {SECTIONS.map((s) => (
              <button
                key={s.id}
                onClick={() => setSection(s.id)}
                className={cn(
                  "block w-full rounded-lg px-2.5 py-1.5 text-left text-[13px] transition-colors",
                  section === s.id
                    ? "bg-br-light font-medium text-br-deep dark:bg-br-light-dark dark:text-[#a7d3ba]"
                    : "text-muted hover:bg-surface-soft hover:text-ink dark:hover:bg-surface-dark dark:hover:text-[#e8efe9]"
                )}
              >
                {s.label}
              </button>
            ))}
          </nav>
        </div>

        <div className="min-w-0 flex-1 pb-10">
          {section === "general" && (
            <div className="space-y-4">
              <SectionTitle>General</SectionTitle>
              <div className="card p-4">
                <p className="text-[13px] text-ink dark:text-[#e8efe9]">
                  Orbit is a local-first personal workspace.
                </p>
                <p className="mt-1 text-[12px] text-muted">
                  All your data is stored in a SQLite database on this device. No
                  account, no cloud, no internet required.
                </p>
              </div>
              <div className="card p-4">
                <p className="text-[13px] font-medium text-ink dark:text-[#e8efe9]">Quick access</p>
                <p className="mt-1 text-[12px] text-muted">
                  Press <kbd className="kbd">N</kbd> for a new task,{" "}
                  <kbd className="kbd">/</kbd> to search, or{" "}
                  <kbd className="kbd">1</kbd>–<kbd className="kbd">6</kbd> to jump
                  between pages.
                </p>
              </div>
            </div>
          )}

          {section === "appearance" && (
            <div className="space-y-4">
              <SectionTitle icon={<Palette className="h-4 w-4" />}>Appearance</SectionTitle>
              <div className="grid grid-cols-3 gap-3">
                {(
                  [
                    { id: "light", label: "Light", icon: <Sun className="h-4 w-4" /> },
                    { id: "dark", label: "Dark", icon: <Moon className="h-4 w-4" /> },
                    { id: "system", label: "System", icon: <Monitor className="h-4 w-4" /> },
                  ] as Array<{ id: ThemeSetting; label: string; icon: React.ReactNode }>
                ).map((opt) => (
                  <button
                    key={opt.id}
                    onClick={() => setTheme(opt.id)}
                    className={cn(
                      "card flex flex-col items-center gap-2 p-4 transition-all",
                      theme === opt.id && "border-br ring-2 ring-br/30"
                    )}
                  >
                    <span
                      className={cn(
                        "text-br",
                        theme !== opt.id && "text-faint"
                      )}
                    >
                      {opt.icon}
                    </span>
                    <span className="text-[13px] font-medium capitalize text-ink dark:text-[#e8efe9]">
                      {opt.label}
                    </span>
                  </button>
                ))}
              </div>
              <p className="text-[12px] text-muted">
                System follows your operating system preference.
              </p>
            </div>
          )}

          {section === "notifications" && (
            <div className="space-y-4">
              <SectionTitle>Notifications</SectionTitle>
              <div className="card divide-y divide-line dark:divide-line-dark">
                <div className="flex items-center justify-between p-4">
                  <div>
                    <p className="text-[13px] font-medium text-ink dark:text-[#e8efe9]">
                      Enable notifications
                    </p>
                    <p className="text-[12px] text-muted">
                      Remind me about upcoming tasks and events.
                    </p>
                  </div>
                  <Toggle
                    on={notif.enabled}
                    onChange={(v) => toggleNotifications(v)}
                  />
                </div>
                <div className="flex items-center justify-between p-4">
                  <div>
                    <p className="text-[13px] font-medium text-ink dark:text-[#e8efe9]">
                      Upcoming scheduled tasks
                    </p>
                    <p className="text-[12px] text-muted">
                      Notify when a scheduled task is about to start.
                    </p>
                  </div>
                  <Toggle
                    on={notif.taskScheduled}
                    onChange={(v) => setNotif({ taskScheduled: v })}
                  />
                </div>
                <div className="flex items-center justify-between p-4">
                  <div>
                    <p className="text-[13px] font-medium text-ink dark:text-[#e8efe9]">
                      Task deadlines
                    </p>
                    <p className="text-[12px] text-muted">
                      Notify before a task is due.
                    </p>
                  </div>
                  <Toggle
                    on={notif.taskDue}
                    onChange={(v) => setNotif({ taskDue: v })}
                  />
                </div>
                <div className="flex items-center justify-between p-4">
                  <div>
                    <p className="text-[13px] font-medium text-ink dark:text-[#e8efe9]">
                      Overdue tasks
                    </p>
                    <p className="text-[12px] text-muted">
                      Remind about tasks that are past due.
                    </p>
                  </div>
                  <Toggle
                    on={notif.taskOverdue}
                    onChange={(v) => setNotif({ taskOverdue: v })}
                  />
                </div>
                <div className="flex items-center justify-between p-4">
                  <div>
                    <p className="text-[13px] font-medium text-ink dark:text-[#e8efe9]">
                      Upcoming events
                    </p>
                    <p className="text-[12px] text-muted">
                      Notify before a calendar event begins.
                    </p>
                  </div>
                  <Toggle
                    on={notif.events}
                    onChange={(v) => setNotif({ events: v })}
                  />
                </div>
                <div className="flex items-center justify-between p-4">
                  <div>
                    <p className="text-[13px] font-medium text-ink dark:text-[#e8efe9]">
                      Remind me
                    </p>
                    <p className="text-[12px] text-muted">
                      How far in advance to notify.
                    </p>
                  </div>
                  <select
                    value={notif.remindMinutes}
                    onChange={(e) => setNotif({ remindMinutes: Number(e.target.value) })}
                    className="input w-28 py-1 text-[13px]"
                  >
                    {[5, 10, 15, 30, 60, 120].map((m) => (
                      <option key={m} value={m}>
                        {m} min
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
          )}

          {section === "shortcuts" && (
            <div className="space-y-4">
              <SectionTitle icon={<Keyboard className="h-4 w-4" />}>Keyboard Shortcuts</SectionTitle>
              <div className="card divide-y divide-line dark:divide-line-dark">
                {SHORTCUTS.map((s) => (
                  <div key={s.keys + s.action} className="flex items-center justify-between px-4 py-2.5">
                    <span className="text-[13px] text-ink-soft dark:text-[#cfd9d2]">{s.action}</span>
                    <span>
                      {s.keys.split(" ").map((k, i) => (
                        <span key={i}>
                          {i > 0 && <span className="mx-0.5 text-faint">+</span>}
                          <kbd className="kbd">{k}</kbd>
                        </span>
                      ))}
                    </span>
                  </div>
                ))}
              </div>
              <p className="text-[12px] text-muted">
                On Windows and Linux use Ctrl instead of ⌘.
              </p>
            </div>
          )}

          {section === "data" && (
            <div className="space-y-4">
              <SectionTitle icon={<Database className="h-4 w-4" />}>Data</SectionTitle>
              <div className="card divide-y divide-line dark:divide-line-dark">
                <DataRow
                  icon={<Download className="h-4 w-4" />}
                  title="Export data"
                  desc="Save all tasks, notes, projects, and events as a JSON file."
                  actionLabel={busy === "export" ? "Exporting…" : "Export"}
                  disabled={!!busy}
                  onClick={exportData}
                />
                <DataRow
                  icon={<Upload className="h-4 w-4" />}
                  title="Import data"
                  desc="Restore from a previously exported JSON file."
                  actionLabel={busy === "import" ? "Importing…" : "Import"}
                  disabled={!!busy}
                  onClick={importData}
                />
                <DataRow
                  icon={<FileDown className="h-4 w-4" />}
                  title="Local backup"
                  desc="Create a copy of the raw SQLite database file."
                  actionLabel={busy === "backup" ? "Backing up…" : "Backup"}
                  disabled={!!busy}
                  onClick={backupDb}
                />
              </div>
              <p className="text-[12px] text-muted">
                All data lives locally in Orbit's app data directory. Importing
                replaces nothing — it merges and overwrites records with matching
                IDs.
              </p>
            </div>
          )}

          {section === "about" && (
            <div className="space-y-4">
              <SectionTitle>About</SectionTitle>
              <div className="card p-5">
                <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-br text-white">
                  <svg viewBox="0 0 24 24" className="h-7 w-7" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                    <ellipse cx="12" cy="12" rx="9" ry="5" transform="rotate(-20 12 12)" />
                    <ellipse cx="12" cy="12" rx="9" ry="5" transform="rotate(70 12 12)" />
                    <circle cx="12" cy="12" r="1.6" fill="currentColor" stroke="none" />
                  </svg>
                </div>
                <h2 className="text-lg font-semibold tracking-tight text-ink dark:text-[#e8efe9]">Orbit</h2>
                <p className="text-[13px] text-muted">Your personal workspace.</p>
                <p className="mt-3 text-[12px] text-faint">
                  Version 0.1.0 · Local-first · Tauri + React + SQLite
                </p>
                <p className="mt-1 max-w-md text-[12px] leading-relaxed text-muted">
                  Tasks are what I need to do. Projects are what I'm working on.
                  Notes are what I want to remember. Calendar is when things happen.
                  One source of truth. Multiple useful views.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function SectionTitle({
  children,
  icon,
}: {
  children: React.ReactNode;
  icon?: React.ReactNode;
}) {
  return (
    <h2 className="flex items-center gap-2 text-[14px] font-semibold text-ink dark:text-[#e8efe9]">
      {icon}
      {children}
    </h2>
  );
}

function Toggle({ on, onChange }: { on: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      role="switch"
      aria-checked={on}
      onClick={() => onChange(!on)}
      className={cn(
        "relative h-5 w-9 shrink-0 rounded-full transition-colors",
        on ? "bg-br" : "bg-line dark:bg-line-dark"
      )}
    >
      <span
        className={cn(
          "absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-all",
          on ? "left-[18px]" : "left-0.5"
        )}
      />
    </button>
  );
}

function DataRow({
  icon,
  title,
  desc,
  actionLabel,
  disabled,
  onClick,
}: {
  icon: React.ReactNode;
  title: string;
  desc: string;
  actionLabel: string;
  disabled: boolean;
  onClick: () => void;
}) {
  return (
    <div className="flex items-center gap-3 p-4">
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-br-light text-br dark:bg-br-light-dark dark:text-[#a7d3ba]">
        {icon}
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-[13px] font-medium text-ink dark:text-[#e8efe9]">{title}</p>
        <p className="text-[12px] text-muted">{desc}</p>
      </div>
      <button className="btn btn-outline shrink-0" disabled={disabled} onClick={onClick}>
        {actionLabel}
      </button>
    </div>
  );
}