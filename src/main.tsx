import React, { Component, type ErrorInfo, type ReactNode } from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import { useStore } from "./lib/store";
import "./styles.css";

declare global {
  interface Window {
    __orbitDiag?: (msg: string) => void;
  }
}

window.__orbitDiag?.("app: main.tsx module evaluated");
try {
  window.__orbitDiag?.(
    "app: ls=" + String(localStorage.getItem("orbit-settings")).slice(0, 200)
  );
} catch (e) {
  window.__orbitDiag?.("app: ls error " + String(e));
}

class ErrorBoundary extends Component<
  { children: ReactNode },
  { error: Error | null }
> {
  state = { error: null as Error | null };

  static getDerivedStateFromError(error: Error) {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    let page = "?";
    try {
      page = useStore.getState().page;
    } catch {
      /* store may not be ready */
    }
    window.__orbitDiag?.(
      "app: ErrorBoundary page=" +
        page +
        " : " +
        error.message +
        "\nSTACK: " +
        info.componentStack
    );
  }

  render() {
    if (this.state.error) {
      return (
        <div style={{ padding: 40, fontFamily: "sans-serif" }}>
          <h2 style={{ color: "#b3564a" }}>Orbit hit a problem</h2>
          <pre style={{ fontSize: 12, whiteSpace: "pre-wrap" }}>
            {String(this.state.error)}
          </pre>
          <button onClick={() => this.setState({ error: null })}>Retry</button>
        </div>
      );
    }
    return this.props.children;
  }
}

try {
  ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
    <React.StrictMode>
      <ErrorBoundary>
        <App />
      </ErrorBoundary>
    </React.StrictMode>
  );
  window.__orbitDiag?.("app: React rendered");
} catch (e) {
  window.__orbitDiag?.("app: render crash: " + String(e));
  throw e;
}
