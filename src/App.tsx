import { memo, useEffect, useState } from "react";
import { initDb } from "./lib/db";
import { applyTheme, tickNotifications, useStore } from "./lib/store";
import { cn } from "./lib/utils";
import { AppShellSkeleton, PageSkeleton } from "./components/skeletons";
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

const MemoHomePage = memo(HomePage);
const MemoTasksPage = memo(TasksPage);
const MemoNotesPage = memo(NotesPage);
const MemoKanbanPage = memo(KanbanPage);
const MemoCalendarPage = memo(CalendarPage);
const MemoProjectsPage = memo(ProjectsPage);
const MemoProjectPage = memo(ProjectPage);
const MemoSettingsPage = memo(SettingsPage);

export default function App() {
  const page = useStore((s) => s.page);
  const params = useStore((s) => s.params);
  const loaded = useStore((s) => s.loaded);
  const loadAll = useStore((s) => s.loadAll);
  const theme = useStore((s) => s.theme);

  const taskId = params.taskId;
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [drawerTaskId, setDrawerTaskId] = useState<string | undefined>(undefined);

  const [prevPage, setPrevPage] = useState<PageName>(page);
  const [skeletonPage, setSkeletonPage] = useState<PageName | null>(null);

  if (prevPage !== page) {
    setPrevPage(page);
    setSkeletonPage(page);
  }

  if (taskId) {
    if (drawerTaskId !== taskId) setDrawerTaskId(taskId);
    if (!drawerOpen) setDrawerOpen(true);
  } else if (drawerOpen) {
    setDrawerOpen(false);
  }

  useEffect(() => {
    if (!loaded) return;
    const raf = requestAnimationFrame(() => {
      requestAnimationFrame(() => setSkeletonPage((p) => (p === page ? null : p)));
    });
    return () => cancelAnimationFrame(raf);
  }, [page, loaded]);

  useEffect(() => {
    if (!drawerOpen && drawerTaskId) {
      const t = setTimeout(() => setDrawerTaskId(undefined), 80);
      return () => clearTimeout(t);
    }
  }, [drawerOpen, drawerTaskId]);

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
    const interval = window.setInterval(tickNotifications, 60000);
    return () => window.clearInterval(interval);
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
      <div className="flex h-full">
        <Layout />
        <main className="min-w-0 flex-1 overflow-hidden">
          <AppShellSkeleton />
        </main>
      </div>
    );
  }

  return (
    <div className="flex h-full">
      <Layout />
      <main className="min-w-0 flex-1 overflow-hidden">
        {page === "home" && (skeletonPage === "home" ? <PageSkeleton page="home" /> : <MemoHomePage />)}
        {page === "tasks" && (skeletonPage === "tasks" ? <PageSkeleton page="tasks" /> : <MemoTasksPage />)}
        {page === "notes" && (skeletonPage === "notes" ? <PageSkeleton page="notes" /> : <MemoNotesPage />)}
        {page === "kanban" && (skeletonPage === "kanban" ? <PageSkeleton page="kanban" /> : <MemoKanbanPage />)}
        {page === "calendar" && (skeletonPage === "calendar" ? <PageSkeleton page="calendar" /> : <MemoCalendarPage />)}
        {page === "projects" && (skeletonPage === "projects" ? <PageSkeleton page="projects" /> : <MemoProjectsPage />)}
        {page === "project" &&
          params.projectId &&
          (skeletonPage === "project" ? <PageSkeleton page="project" /> : <MemoProjectPage id={params.projectId} />)}
        {page === "settings" && (skeletonPage === "settings" ? <PageSkeleton page="settings" /> : <MemoSettingsPage />)}
      </main>
      <div
        className={cn(
          "flex h-full shrink-0 flex-col overflow-hidden transition-[width] duration-80",
          drawerOpen ? "w-[440px] ease-out" : "w-0 ease-in"
        )}
      >
        {drawerTaskId && <TaskDrawer key={drawerTaskId} taskId={drawerTaskId} />}
      </div>
      <SearchDialog />
      <Toasts />
    </div>
  );
}
