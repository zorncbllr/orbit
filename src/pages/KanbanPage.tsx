import { useEffect, useState } from "react";
import KanbanBoard from "../components/KanbanBoard";
import { useStore } from "../lib/store";
import { KANBAN_DATE_FILTERS, type KanbanDateFilter } from "../lib/utils";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../components/ui/select";

export default function KanbanPage() {
  const ui = useStore((s) => s.ui);
  const setUi = useStore((s) => s.setUi);
  const [projectId, setProjectId] = useState<string>(
    () => (ui.kanbanProject as string) ?? "all"
  );
  const [dateFilter, setDateFilter] = useState<KanbanDateFilter>(
    () => (ui.kanbanDateFilter as KanbanDateFilter) ?? "all"
  );
  const projects = useStore((s) => s.projects);

  useEffect(() => {
    setUi({ kanbanProject: projectId, kanbanDateFilter: dateFilter });
  }, [projectId, dateFilter]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="flex h-full flex-col">
      <div className="mx-auto w-full max-w-6xl px-8 pb-4 pt-6">
        <header className="mb-4 flex items-center justify-between">
          <div>
            <h1 className="text-xl font-semibold tracking-tight text-ink dark:text-[#e8efe9]">
              Kanban
            </h1>
            <p className="text-[13px] text-muted">
              Visually manage your tasks.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <label className="flex items-center gap-2 text-[12px] text-muted">
              Project
              <Select value={projectId} onValueChange={setProjectId}>
                <SelectTrigger className="w-44 py-1.5 text-[13px]">
                  <SelectValue placeholder="Project" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Projects</SelectItem>
                  {projects.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </label>
            <label className="flex items-center gap-2 text-[12px] text-muted">
              When
              <Select value={dateFilter} onValueChange={(v) => setDateFilter(v as KanbanDateFilter)}>
                <SelectTrigger className="w-32 py-1.5 text-[13px]">
                  <SelectValue placeholder="When" />
                </SelectTrigger>
                <SelectContent>
                  {KANBAN_DATE_FILTERS.map((f) => (
                    <SelectItem key={f.id} value={f.id}>
                      {f.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </label>
          </div>
        </header>
      </div>
      <div className="min-h-0 flex-1 px-8 pb-6">
        <div className="mx-auto h-full max-w-6xl">
          <KanbanBoard
            projectId={projectId === "all" ? undefined : projectId}
            dateFilter={dateFilter}
          />
        </div>
      </div>
    </div>
  );
}