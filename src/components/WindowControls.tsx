import { useEffect, useState } from "react";
import { Copy, Minus, Square, X } from "lucide-react";
import { isTauri } from "@tauri-apps/api/core";
import { getCurrentWindow } from "@tauri-apps/api/window";

const diag = (m: string) => window.__orbitDiag?.(`winctrl: ${m}`);

export default function WindowControls() {
  const [maximized, setMaximized] = useState(false);

  useEffect(() => {
    if (!isTauri()) return;
    const win = getCurrentWindow();
    let disposed = false;
    const refresh = () =>
      win.isMaximized().then(
        (m) => { if (!disposed) setMaximized(m); },
        (e: unknown) => diag(`is_maximized FAILED: ${String(e)}`)
      );
    void refresh();
    const unlisten = win.onResized(refresh);
    unlisten.catch((e: unknown) => diag(`onResized FAILED: ${String(e)}`));
    return () => {
      disposed = true;
      unlisten.then((fn) => fn());
    };
  }, []);

  if (!isTauri()) return null;

  const win = getCurrentWindow();

  const run = (name: string, cmd: () => Promise<void>) => {
    diag(`clicked ${name}`);
    cmd().then(
      () => diag(`${name} ok`),
      (e: unknown) => diag(`${name} FAILED: ${String(e)}`)
    );
  };

  return (
    <>
      <div
        data-tauri-drag-region
        onDoubleClick={() => run("dblclick", () => win.toggleMaximize())}
        className="fixed inset-x-0 top-0 z-30 h-11 select-none"
      />
      <div className="fixed right-0 top-0 z-40 flex h-11 items-stretch">
        <button
          onClick={() => run("minimize", () => win.minimize())}
          aria-label="Minimize"
          className="flex w-12 items-center justify-center text-muted transition-colors hover:bg-surface-soft hover:text-ink dark:hover:bg-surface-dark dark:hover:text-[#e8efe9]"
        >
          <Minus className="h-4 w-4" />
        </button>
        <button
          onClick={() => run("toggle_maximize", () => win.toggleMaximize())}
          aria-label={maximized ? "Restore" : "Maximize"}
          className="flex w-12 items-center justify-center text-muted transition-colors hover:bg-surface-soft hover:text-ink dark:hover:bg-surface-dark dark:hover:text-[#e8efe9]"
        >
          {maximized ? <Copy className="h-3.5 w-3.5" /> : <Square className="h-3.5 w-3.5" />}
        </button>
        <button
          onClick={() => run("close", () => win.close())}
          aria-label="Close"
          className="flex w-12 items-center justify-center text-muted transition-colors hover:bg-surface-soft hover:text-ink dark:hover:bg-surface-dark dark:hover:text-[#e8efe9]"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </>
  );
}
