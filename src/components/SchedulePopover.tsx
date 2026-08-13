import { useEffect } from "react";
import SchedulePicker, { type ScheduleValue } from "./SchedulePicker";

export default function SchedulePopover({
  open,
  onClose,
  anchor,
  value,
  onChange,
}: {
  open: boolean;
  onClose: () => void;
  anchor: HTMLElement | null;
  value: ScheduleValue;
  onChange: (v: ScheduleValue) => void;
}) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open || !anchor) return null;

  const W = 360;
  const rect = anchor.getBoundingClientRect();
  const left = Math.min(Math.max(12, rect.left), window.innerWidth - W - 12);
  const below = rect.bottom + 6;
  const top =
    below + 500 > window.innerHeight ? Math.max(12, rect.top - 6 - 500) : below;

  return (
    <>
      <div className="fixed inset-0 z-[60]" onClick={onClose} />
      <div
        className="fixed z-[61] w-[360px] rounded-xl border border-line bg-surface shadow-md dark:border-line-dark dark:bg-surface-dark-card"
        style={{ left, top }}
      >
        <div className="max-h-[70vh] overflow-y-auto p-3">
          <SchedulePicker value={value} onChange={onChange} />
        </div>
      </div>
    </>
  );
}
