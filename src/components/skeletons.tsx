import { cn } from "../lib/utils";
import type { PageName } from "../lib/store";

function Block({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "animate-pulse rounded-md bg-ink/10 dark:bg-white/10",
        className
      )}
    />
  );
}

function HomeSkeleton() {
  return (
    <div className="h-full overflow-hidden">
      <div className="mx-auto max-w-3xl px-8 py-6">
        <Block className="h-6 w-44" />
        <Block className="mt-2 h-3 w-56" />
        <div className="mt-5 grid grid-cols-3 gap-3">
          {[0, 1, 2].map((i) => (
            <Block key={i} className="h-16" />
          ))}
        </div>
        <div className="mt-6 rounded-xl border border-line p-4 dark:border-line-dark">
          {[0, 1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="flex items-center gap-3 py-[3px]">
              <Block className="h-3 w-8" />
              <Block className="h-3 flex-1" />
              <Block className="h-3 w-6" />
            </div>
          ))}
        </div>
        <div className="mt-6 grid grid-cols-1 gap-6 sm:grid-cols-2">
          <div className="space-y-3">
            <Block className="h-4 w-32" />
            {[0, 1, 2].map((i) => (
              <Block key={i} className="h-10" />
            ))}
          </div>
          <div className="space-y-3">
            <Block className="h-4 w-32" />
            {[0, 1, 2].map((i) => (
              <Block key={i} className="h-8" />
            ))}
          </div>
        </div>
        <div className="mt-6 space-y-2">
          <Block className="h-4 w-24" />
          {[0, 1, 2, 3].map((i) => (
            <Block key={i} className="h-9" />
          ))}
        </div>
      </div>
    </div>
  );
}

function TasksSkeleton() {
  return (
    <div className="h-full overflow-hidden">
      <div className="mx-auto max-w-3xl px-8 py-6">
        <Block className="h-6 w-40" />
        <Block className="mt-2 h-3 w-64" />
        <div className="mt-4 flex items-center gap-1 border-b border-line pb-0 dark:border-line-dark">
          {[0, 1, 2, 3].map((i) => (
            <Block key={i} className="h-8 w-20" />
          ))}
        </div>
        <Block className="mt-4 h-10" />
        <div className="mt-5 space-y-1">
          {[0, 1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="flex items-center gap-3 px-2 py-2">
              <Block className="h-[18px] w-[18px] rounded-full" />
              <div className="flex-1 space-y-1.5">
                <Block className="h-3.5 w-2/3" />
                <Block className="h-3 w-40" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function NotesSkeleton() {
  return (
    <div className="flex h-full">
      <div className="flex w-72 shrink-0 flex-col border-r border-line p-3 dark:border-line-dark">
        <Block className="h-9" />
        <Block className="mt-2 h-9" />
        <div className="mt-3 flex-1 space-y-1">
          {[0, 1, 2, 3, 4, 5, 6, 7].map((i) => (
            <div key={i} className="space-y-1.5 rounded-lg px-3 py-2">
              <Block className="h-3.5 w-2/3" />
              <Block className="h-2.5 w-1/3" />
            </div>
          ))}
        </div>
      </div>
      <div className="flex min-w-0 flex-1 items-center justify-center">
        <div className="w-full max-w-lg space-y-3 px-8">
          <Block className="h-7 w-1/2" />
          <Block className="h-4 w-full" />
          <Block className="h-4 w-5/6" />
          <Block className="h-4 w-2/3" />
          <Block className="h-32 w-full" />
        </div>
      </div>
    </div>
  );
}

function KanbanSkeleton() {
  return (
    <div className="flex h-full flex-col">
      <div className="mx-auto w-full max-w-6xl px-8 pb-4 pt-6">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <Block className="h-6 w-32" />
            <Block className="mt-2 h-3 w-48" />
          </div>
          <Block className="h-8 w-72" />
        </div>
      </div>
      <div className="min-h-0 flex-1 px-8 pb-6">
        <div className="mx-auto grid h-full max-w-6xl grid-cols-4 gap-3">
          {[0, 1, 2, 3].map((c) => (
            <div
              key={c}
              className="flex flex-col rounded-xl border border-line p-2 dark:border-line-dark"
            >
              <Block className="h-4 w-20" />
              <div className="mt-3 space-y-2">
                {[0, 1, 2].map((i) => (
                  <Block key={i} className="h-16" />
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function CalendarSkeleton() {
  return (
    <div className="flex h-full flex-col">
      <div className="mx-auto w-full max-w-6xl px-8 pb-3 pt-6">
        <div className="flex items-center justify-between">
          <div>
            <Block className="h-6 w-32" />
            <Block className="mt-2 h-3 w-44" />
          </div>
          <Block className="h-8 w-24" />
        </div>
        <div className="mt-3 flex items-center justify-between">
          <Block className="h-8 w-44" />
          <Block className="h-8 w-32" />
          <Block className="h-8 w-40" />
        </div>
      </div>
      <div className="min-h-0 flex-1 px-8 pb-6">
        <div className="mx-auto h-full max-w-6xl">
          <div className="grid h-full grid-rows-[auto_1fr] gap-2">
            <div className="grid grid-cols-7">
              {[0, 1, 2, 3, 4, 5, 6].map((i) => (
                <Block key={i} className="mx-auto h-3 w-8" />
              ))}
            </div>
            <div className="grid grid-cols-7 grid-rows-6 gap-px overflow-hidden rounded-xl border border-line dark:border-line-dark">
              {Array.from({ length: 42 }).map((_, i) => (
                <Block key={i} className="h-full rounded-none" />
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function ProjectsSkeleton() {
  return (
    <div className="h-full overflow-hidden">
      <div className="mx-auto max-w-4xl px-8 py-6">
        <header className="mb-5 flex items-center justify-between">
          <div>
            <Block className="h-6 w-32" />
            <Block className="mt-2 h-3 w-52" />
          </div>
          <Block className="h-8 w-32" />
        </header>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {[0, 1, 2, 3].map((i) => (
            <div
              key={i}
              className="rounded-xl border border-line p-4 dark:border-line-dark"
            >
              <div className="flex items-center gap-2.5">
                <Block className="h-8 w-8 rounded-lg" />
                <div className="flex-1 space-y-1.5">
                  <Block className="h-4 w-1/2" />
                  <Block className="h-3 w-1/3" />
                </div>
              </div>
              <Block className="mt-3 h-1.5 w-full rounded-full" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function ProjectSkeleton() {
  return (
    <div className="h-full overflow-hidden">
      <div className="mx-auto max-w-4xl px-8 py-6">
        <Block className="h-3 w-24" />
        <div className="mt-4 flex items-center gap-3">
          <Block className="h-10 w-10 rounded-lg" />
          <div className="flex-1 space-y-2">
            <Block className="h-6 w-1/2" />
            <Block className="h-3 w-2/3" />
          </div>
        </div>
        <Block className="mt-3 h-1.5 w-72 rounded-full" />
        <div className="mt-4 flex items-center gap-1 border-b border-line pb-0 dark:border-line-dark">
          {[0, 1, 2, 3].map((i) => (
            <Block key={i} className="h-8 w-20" />
          ))}
        </div>
        <div className="mt-5 space-y-2">
          {[0, 1, 2, 3, 4].map((i) => (
            <Block key={i} className="h-10" />
          ))}
        </div>
      </div>
    </div>
  );
}

function SettingsSkeleton() {
  return (
    <div className="h-full overflow-hidden">
      <div className="mx-auto flex max-w-4xl gap-8 px-8 py-6">
        <div className="w-44 shrink-0 space-y-3">
          <Block className="h-6 w-28" />
          {[0, 1, 2, 3, 4, 5].map((i) => (
            <Block key={i} className="h-7 w-full" />
          ))}
        </div>
        <div className="min-w-0 flex-1 space-y-4 pb-10">
          <Block className="h-5 w-32" />
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className="rounded-xl border border-line p-4 dark:border-line-dark"
            >
              <Block className="h-4 w-40" />
              <Block className="mt-2 h-3 w-3/4" />
              <Block className="mt-1.5 h-3 w-1/2" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export function PageSkeleton({ page }: { page: PageName }) {
  switch (page) {
    case "home":
      return <HomeSkeleton />;
    case "tasks":
      return <TasksSkeleton />;
    case "notes":
      return <NotesSkeleton />;
    case "kanban":
      return <KanbanSkeleton />;
    case "calendar":
      return <CalendarSkeleton />;
    case "projects":
      return <ProjectsSkeleton />;
    case "project":
      return <ProjectSkeleton />;
    case "settings":
      return <SettingsSkeleton />;
    default:
      return <AppShellSkeleton />;
  }
}

export function DrawerSkeleton() {
  return (
    <div className="flex h-full w-[440px] shrink-0 flex-col border-l border-line bg-surface dark:border-line-dark dark:bg-surface-dark-card">
      <div className="flex items-center justify-between border-b border-line px-5 py-3 dark:border-line-dark">
        <Block className="h-3 w-12" />
        <Block className="h-4 w-4 rounded" />
      </div>
      <div className="flex-1 space-y-4 overflow-hidden px-5 py-4">
        <Block className="h-7 w-3/4" />
        <div className="flex flex-wrap items-center gap-1.5">
          <Block className="h-5 w-20 rounded-full" />
          <Block className="h-5 w-24 rounded-full" />
          <Block className="h-5 w-28 rounded-full" />
        </div>
        <div className="flex gap-1">
          {[0, 1, 2, 3].map((i) => (
            <Block key={i} className="h-8 flex-1" />
          ))}
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Block className="h-10" />
          <Block className="h-10" />
        </div>
        <Block className="h-10" />
        <Block className="h-32" />
        <div className="space-y-2">
          {[0, 1, 2].map((i) => (
            <div key={i} className="flex items-center gap-2">
              <Block className="h-4 w-4 rounded" />
              <Block className="h-3 flex-1" />
            </div>
          ))}
        </div>
      </div>
      <div className="flex items-center gap-2 border-t border-line px-5 py-3 dark:border-line-dark">
        <Block className="h-8 w-24" />
        <div className="flex-1" />
        <Block className="h-8 w-20" />
      </div>
    </div>
  );
}

export function AppShellSkeleton() {
  return (
    <div className="h-full overflow-hidden">
      <div className="mx-auto max-w-3xl px-8 py-6">
        <Block className="h-6 w-44" />
        <Block className="mt-2 h-3 w-56" />
        <div className="mt-5 grid grid-cols-3 gap-3">
          {[0, 1, 2].map((i) => (
            <Block key={i} className="h-16" />
          ))}
        </div>
        <div className="mt-6 space-y-2">
          {[0, 1, 2, 3, 4, 5].map((i) => (
            <Block key={i} className="h-10" />
          ))}
        </div>
      </div>
    </div>
  );
}
