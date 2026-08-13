import { useMemo, useState } from "react";
import { CalendarClock, Plus } from "lucide-react";
import { useStore } from "../lib/store";
import { parseSchedule, scheduleSummary } from "../lib/schedule";

export default function QuickAdd({
  placeholder = "Add task…",
  defaultProjectId = null,
  onCreate,
}: {
  placeholder?: string;
  defaultProjectId?: string | null;
  onCreate?: (id: string) => void;
}) {
  const [value, setValue] = useState("");
  const createTask = useStore((s) => s.createTask);
  const toast = useStore((s) => s.toast);

  const parsed = useMemo(
    () => (value.trim() ? parseSchedule(value) : null),
    [value]
  );
  const summary =
    parsed && (parsed.due_at || parsed.scheduled_start)
      ? scheduleSummary(parsed)
      : null;

  const submit = async () => {
    const title = value.trim();
    if (!title) return;
    setValue("");
    const id = await createTask({
      title: parsed?.title || title,
      project_id: defaultProjectId ?? null,
      due_at: parsed?.due_at ?? null,
      scheduled_start: parsed?.scheduled_start ?? null,
      scheduled_end: parsed?.scheduled_end ?? null,
      skip_default_times: !!(parsed?.due_at && !parsed.scheduled_start),
    });
    toast(`Task added`, "success");
    onCreate?.(id);
  };

  return (
    <div>
      <div className="flex items-center gap-2 rounded-lg border border-dashed border-line px-3 py-2 transition-colors focus-within:border-solid focus-within:border-br dark:border-line-dark">
        <Plus className="h-4 w-4 shrink-0 text-faint" />
        <input
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && submit()}
          placeholder={placeholder}
          className="js-quickadd flex-1 bg-transparent text-[13.5px] text-ink placeholder:text-faint focus:outline-none dark:text-[#e8efe9]"
        />
      </div>
      {summary && (
        <div className="mt-1.5 flex items-center gap-1.5 text-[11.5px] text-muted">
          <CalendarClock className="h-3 w-3 text-br" />
          <span className="text-br-deep dark:text-[#a7d3ba]">{summary}</span>
          <span className="text-faint">· press Enter to add</span>
        </div>
      )}
    </div>
  );
}

export function focusQuickAdd() {
  const el = document.querySelector<HTMLInputElement>(".js-quickadd");
  el?.focus();
}
