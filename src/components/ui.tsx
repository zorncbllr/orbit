import { useEffect, type ReactNode } from "react";
import { X } from "lucide-react";
import { cn } from "../lib/utils";

export function Modal({
  open,
  onClose,
  title,
  children,
  width = "max-w-lg",
}: {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
  width?: string;
}) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div
        className="absolute inset-0 bg-ink/30 backdrop-blur-[2px] dark:bg-black/50"
        onClick={onClose}
      />
      <div
        className={cn(
          "relative z-10 w-full overflow-hidden rounded-xl border border-line bg-surface shadow-xl shadow-ink/10 dark:border-line-dark dark:bg-surface-dark-card",
          width
        )}
      >
        <div className="flex items-center justify-between border-b border-line px-4 py-3 dark:border-line-dark">
          <h2 className="text-sm font-semibold text-ink dark:text-[#e8efe9]">
            {title}
          </h2>
          <button
            onClick={onClose}
            className="rounded-md p-1 text-muted transition-colors hover:bg-surface-soft hover:text-ink dark:hover:bg-surface-dark"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="max-h-[75vh] overflow-y-auto px-4 py-4">{children}</div>
      </div>
    </div>
  );
}

export function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel = "Delete",
  onConfirm,
  onCancel,
}: {
  open: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  if (!open) return null;
  return (
    <Modal open={open} onClose={onCancel} title={title}>
      <p className="text-sm text-muted">{message}</p>
      <div className="mt-4 flex justify-end gap-2">
        <button className="btn btn-outline" onClick={onCancel}>
          Cancel
        </button>
        <button
          className="btn text-white hover:brightness-95"
          style={{ background: "var(--color-coral)" }}
          onClick={onConfirm}
        >
          {confirmLabel}
        </button>
      </div>
    </Modal>
  );
}

export function EmptyState({
  icon,
  title,
  hint,
  action,
}: {
  icon?: ReactNode;
  title: string;
  hint?: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 py-16 text-center">
      {icon && (
        <div className="mb-1 flex h-11 w-11 items-center justify-center rounded-full bg-br-light text-br dark:bg-br-light-dark dark:text-[#a7d3ba]">
          {icon}
        </div>
      )}
      <p className="text-sm font-medium text-ink dark:text-[#e8efe9]">{title}</p>
      {hint && <p className="max-w-xs text-[13px] text-muted">{hint}</p>}
      {action && <div className="mt-2">{action}</div>}
    </div>
  );
}

export function ProgressBar({
  value,
  className,
  barClassName,
}: {
  value: number;
  className?: string;
  barClassName?: string;
}) {
  const v = Math.max(0, Math.min(100, value));
  return (
    <div
      className={cn(
        "h-1.5 w-full overflow-hidden rounded-full bg-surface-soft dark:bg-surface-dark",
        className
      )}
    >
      <div
        className={cn(
          "h-full rounded-full bg-br transition-[width] duration-300",
          barClassName
        )}
        style={{ width: `${v}%` }}
      />
    </div>
  );
}
