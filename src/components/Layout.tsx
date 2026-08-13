import {
  Calendar,
  Columns3,
  FolderKanban,
  House,
  ListTodo,
  NotebookPen,
  Search,
  Settings,
} from "lucide-react";
import { cn } from "../lib/utils";
import type { PageName } from "../lib/store";
import { useStore } from "../lib/store";

const NAV: Array<{ page: PageName; label: string; icon: typeof House; key: string }> = [
  { page: "home", label: "Home", icon: House, key: "1" },
  { page: "tasks", label: "Tasks", icon: ListTodo, key: "2" },
  { page: "notes", label: "Notes", icon: NotebookPen, key: "3" },
  { page: "kanban", label: "Kanban", icon: Columns3, key: "4" },
  { page: "calendar", label: "Calendar", icon: Calendar, key: "5" },
  { page: "projects", label: "Projects", icon: FolderKanban, key: "6" },
];

export default function Layout() {
  const page = useStore((s) => s.page);
  const navigate = useStore((s) => s.navigate);
  const setSearchOpen = useStore((s) => s.setSearchOpen);

  return (
    <aside className="flex w-52 shrink-0 flex-col border-r border-line bg-surface dark:border-line-dark dark:bg-surface-dark-card">
      <div data-tauri-drag-region className="flex cursor-default select-none items-center gap-2 px-4 pb-1 pt-4">
        <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-br">
          <svg viewBox="0 0 24 24" className="h-4.5 w-4.5 text-white" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <ellipse cx="12" cy="12" rx="9" ry="5" transform="rotate(-20 12 12)" />
            <ellipse cx="12" cy="12" rx="9" ry="5" transform="rotate(70 12 12)" />
            <circle cx="12" cy="12" r="1.6" fill="currentColor" stroke="none" />
          </svg>
        </div>
        <span className="text-[15px] font-semibold tracking-tight text-ink dark:text-[#e8efe9]">
          Orbit
        </span>
      </div>

      <nav className="mt-3 flex-1 space-y-0.5 px-2">
        {NAV.map(({ page: p, label, icon: Icon, key }) => {
          const active = page === p;
          return (
            <button
              key={p}
              onClick={() => navigate(p)}
              className={cn(
                "group flex w-full items-center gap-2.5 rounded-lg px-2.5 py-1.5 text-[13px] transition-colors",
                active
                  ? "bg-br-light font-medium text-br-deep dark:bg-br-light-dark dark:text-[#a7d3ba]"
                  : "text-muted hover:bg-surface-soft hover:text-ink dark:hover:bg-surface-dark dark:hover:text-[#e8efe9]"
              )}
            >
              <Icon className="h-4 w-4 shrink-0" strokeWidth={active ? 2 : 1.8} />
              <span className="flex-1 text-left">{label}</span>
              <span
                className={cn(
                  "hidden text-[10px] font-medium text-faint group-hover:inline",
                  active && "text-br/70 dark:text-[#7fae93]"
                )}
              >
                {key}
              </span>
            </button>
          );
        })}
      </nav>

      <div className="space-y-0.5 px-2 pb-3 pt-2">
        <button
          onClick={() => setSearchOpen(true)}
          className="flex w-full items-center gap-2.5 rounded-lg px-2.5 py-1.5 text-[13px] text-muted transition-colors hover:bg-surface-soft hover:text-ink dark:hover:bg-surface-dark dark:hover:text-[#e8efe9]"
        >
          <Search className="h-4 w-4 shrink-0" strokeWidth={1.8} />
          <span className="flex-1 text-left">Search</span>
          <span className="text-[10px] font-medium text-faint">/</span>
        </button>
        <button
          onClick={() => navigate("settings")}
          className={cn(
            "flex w-full items-center gap-2.5 rounded-lg px-2.5 py-1.5 text-[13px] transition-colors",
            page === "settings"
              ? "bg-br-light font-medium text-br-deep dark:bg-br-light-dark dark:text-[#a7d3ba]"
              : "text-muted hover:bg-surface-soft hover:text-ink dark:hover:bg-surface-dark dark:hover:text-[#e8efe9]"
          )}
        >
          <Settings className="h-4 w-4 shrink-0" strokeWidth={1.8} />
          <span className="flex-1 text-left">Settings</span>
        </button>
      </div>
    </aside>
  );
}
