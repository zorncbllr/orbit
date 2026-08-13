import { useEffect, useState } from "react";
import KanbanBoard from "../components/KanbanBoard";
import { useStore } from "../lib/store";
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
  const projects = useStore((s) => s.projects);

  useEffect(() => {
    setUi({ kanbanProject: projectId });
  }, [projectId]); // eslint-disable-line react-hooks/exhaustive-deps

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
        </header>
      </div>
      <div className="min-h-0 flex-1 px-8 pb-6">
        <div className="mx-auto h-full max-w-6xl">
          <KanbanBoard projectId={projectId === "all" ? undefined : projectId} />
        </div>
      </div>
    </div>
  );
}