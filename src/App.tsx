import { useEffect } from "react";
import { initDb } from "./lib/db";
import { applyTheme, tickNotifications, updateRootBg, useStore } from "./lib/store";
import Layout from "./components/Layout";
import SearchDialog from "./components/SearchDialog";
import Toasts from "./components/Toasts";
import HomePage from "./pages/HomePage";
import TasksPage from "./pages/TasksPage";
import NotesPage from "./pages/NotesPage";
import KanbanPage from "./pages/KanbanPage";
import CalendarPage from "./pages/CalendarPage";
import ProjectsPage from "./pages/ProjectsPage";
import ProjectPage from "./pages/ProjectPage";
import SettingsPage from "./pages/SettingsPage";
import TaskDrawer from "./components/TaskDrawer";
import { focusQuickAdd } from "./components/QuickAdd";
import type { PageName } from "./lib/store";

const PAGE_KEYS: Record<string, PageName> = {
  "1": "home",
  "2": "tasks",
  "3": "notes",
  "4": "kanban",
  "5": "calendar",
  "6": "projects",
};

export default function App() {
  const page = useStore((s) => s.page);
  const params = useStore((s) => s.params);
  const loaded = useStore((s) => s.loaded);
  const loadAll = useStore((s) => s.loadAll);
  const theme = useStore((s) => s.theme);

  useEffect(() => {
    if (!loaded) return;
    const main = document.querySelector("main");
    const h1 = document.querySelector("h1");
    window.__orbitDiag?.(
      `app: page rendered — rootLen=${document.getElementById("root")?.innerHTML.length} h1="${h1?.textContent ?? ""}" mainText="${(main?.innerText ?? "").slice(0, 60).replace(/\n/g, "|")}"`
    );
  }, [loaded]);

  useEffect(() => {
    window.__orbitDiag?.("app: initDb starting");
    initDb()
      .then(() => {
        window.__orbitDiag?.("app: db loaded, loading data");
        return loadAll();
      })
      .then(() => window.__orbitDiag?.("app: data loaded"))
      .catch((e) => window.__orbitDiag?.("app: initDb failed: " + String(e)));
  }, [loadAll]);

  useEffect(() => {
    applyTheme(theme);
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const onChange = () => {
      if (useStore.getState().theme === "system") applyTheme("system");
    };
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, [theme]);

  useEffect(() => {
    updateRootBg();
    const interval = window.setInterval(tickNotifications, 60000);
    const onVisibility = () => {
      if (document.visibilityState === "visible") updateRootBg();
    };
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      window.clearInterval(interval);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      const inInput =
        target.tagName === "INPUT" ||
        target.tagName === "TEXTAREA" ||
        target.isContentEditable;
      const state = useStore.getState();
      const meta = e.metaKey || e.ctrlKey;

      if (e.key === "/" && !inInput && !state.searchOpen) {
        e.preventDefault();
        state.setSearchOpen(true);
        return;
      }
      if (meta && e.key.toLowerCase() === "k") {
        e.preventDefault();
        state.setSearchOpen(!state.searchOpen);
        return;
      }
      if (e.key === "n" && !inInput) {
        e.preventDefault();
        if (e.shiftKey) {
          void state.createNote({ title: "Untitled" }).then((id) =>
            state.navigate("notes", { noteId: id })
          );
        } else {
          state.navigate("tasks", {});
          setTimeout(focusQuickAdd, 60);
        }
        return;
      }
      if (!inInput && PAGE_KEYS[e.key]) {
        e.preventDefault();
        const page = PAGE_KEYS[e.key];
        state.navigate(page, page === "tasks" ? {} : {});
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  if (!loaded) {
    return (
      <div className="flex h-full items-center justify-center bg-paper dark:bg-surface-dark">
        <div className="flex flex-col items-center gap-3">
          <div className="h-10 w-10 rounded-full bg-br/15 p-2">
            <div className="h-full w-full animate-spin rounded-full border-2 border-br border-t-transparent" />
          </div>
          <p className="text-sm text-muted">Loading Orbit…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full">
      <Layout />
      <main className="min-w-0 flex-1 overflow-hidden">
        {page === "home" && <HomePage />}
        {page === "tasks" && <TasksPage />}
        {page === "notes" && <NotesPage />}
        {page === "kanban" && <KanbanPage />}
        {page === "calendar" && <CalendarPage />}
        {page === "projects" && <ProjectsPage />}
        {page === "project" && params.projectId && <ProjectPage id={params.projectId} />}
        {page === "settings" && <SettingsPage />}
      </main>
      {params.taskId && <TaskDrawer taskId={params.taskId} />}
      <SearchDialog />
      <Toasts />
    </div>
  );
}
