import { useState } from "react";
import { Plus } from "lucide-react";
import { useStore } from "../lib/store";

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

  const submit = async () => {
    const title = value.trim();
    if (!title) return;
    setValue("");
    const id = await createTask({
      title,
      project_id: defaultProjectId ?? null,
    });
    toast(`Task added`, "success");
    onCreate?.(id);
  };

  return (
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
  );
}

export function focusQuickAdd() {
  const el = document.querySelector<HTMLInputElement>(".js-quickadd");
  el?.focus();
}
