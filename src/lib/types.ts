export type TaskStatus = "todo" | "in_progress" | "done" | "backlog";
export type Priority = "low" | "medium" | "high";
export type ThemeSetting = "light" | "dark" | "system";

export interface Project {
  id: string;
  name: string;
  description: string;
  color: string | null;
  status: "active" | "archived";
  created_at: number;
  updated_at: number;
}

export interface Task {
  id: string;
  title: string;
  description: string;
  status: TaskStatus;
  priority: Priority;
  due_at: number | null;
  scheduled_start: number | null;
  scheduled_end: number | null;
  estimated_duration: number | null;
  project_id: string | null;
  created_at: number;
  updated_at: number;
}

export interface Subtask {
  id: string;
  task_id: string;
  title: string;
  completed: boolean;
  created_at: number;
}

export interface Note {
  id: string;
  title: string;
  content: string;
  project_id: string | null;
  task_id: string | null;
  created_at: number;
  updated_at: number;
}

export interface Event {
  id: string;
  title: string;
  description: string;
  start_at: number;
  end_at: number;
  project_id: string | null;
  created_at: number;
  updated_at: number;
}

export interface DependencyRow {
  task_id: string;
  depends_on_task_id: string;
}

export interface TaskWithExtras extends Task {
  subtasks: Subtask[];
  dependencies: string[];
}

export interface ExportPayload {
  app: string;
  version: string;
  exported_at: number;
  projects: Project[];
  tasks: Task[];
  subtasks: Subtask[];
  notes: Note[];
  events: Event[];
  task_dependencies: DependencyRow[];
  settings: Record<string, unknown>;
}

export interface NotifSettings {
  enabled: boolean;
  remindMinutes: number;
  taskScheduled: boolean;
  taskDue: boolean;
  taskOverdue: boolean;
  events: boolean;
}
