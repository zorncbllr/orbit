import { CheckCircle2, Info, XCircle } from "lucide-react";
import { useStore } from "../lib/store";
import { cn } from "../lib/utils";

export default function Toasts() {
  const toasts = useStore((s) => s.toasts);
  const dismiss = useStore((s) => s.dismissToast);

  return (
    <div className="pointer-events-none fixed bottom-4 right-4 z-[60] flex flex-col gap-2">
      {toasts.map((t) => (
        <div
          key={t.id}
          onClick={() => dismiss(t.id)}
          className={cn(
            "pointer-events-auto flex cursor-pointer items-center gap-2 rounded-lg border px-3 py-2 text-[13px] shadow-lg",
            "border-line bg-surface text-ink dark:border-line-dark dark:bg-surface-dark-card dark:text-[#e8efe9]"
          )}
        >
          {t.type === "success" && (
            <CheckCircle2 className="h-4 w-4 shrink-0 text-br" />
          )}
          {t.type === "error" && (
            <XCircle className="h-4 w-4 shrink-0 text-coral" />
          )}
          {t.type === "info" && <Info className="h-4 w-4 shrink-0 text-br" />}
          <span>{t.message}</span>
        </div>
      ))}
    </div>
  );
}
