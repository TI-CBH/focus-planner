import { useState, useEffect, useMemo, useCallback } from "react";
import pb, { type TaskRecord } from "@/lib/pocketbase";
import { sortTasks, getDueBadge, type SortMode } from "@/lib/priority";
import BottomNav from "@/components/BottomNav";
import TaskCard from "@/components/TaskCard";
import TaskForm from "@/components/TaskForm";
import ImportExport from "@/components/ImportExport";
import {
  Plus, Sun, Moon, ArrowUpDown, Upload,
  Inbox, CalendarDays, Archive, Cloud, LogOut, Loader2
} from "lucide-react";

type View = "today" | "next14" | "backlog" | "someday";

interface PlannerPageProps {
  onLogout: () => void;
}

export default function PlannerPage({ onLogout }: PlannerPageProps) {
  const [tasks, setTasks] = useState<TaskRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<View>("today");
  const [sortMode, setSortMode] = useState<SortMode>("smart");
  const [showForm, setShowForm] = useState(false);
  const [editingTask, setEditingTask] = useState<TaskRecord | null>(null);
  const [showImportExport, setShowImportExport] = useState(false);
  const [dark, setDark] = useState(() => document.documentElement.classList.contains("dark"));

  const fetchTasks = useCallback(async () => {
    try {
      const records = await pb.collection("tasks").getFullList<TaskRecord>({
        sort: "-created",
      });
      setTasks(records);
    } catch (err) {
      console.error("Failed to load tasks:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTasks();
  }, [fetchTasks]);

  const toggleTheme = useCallback(() => {
    const next = !dark;
    setDark(next);
    document.documentElement.classList.toggle("dark", next);
    localStorage.setItem("theme", next ? "dark" : "light");
  }, [dark]);

  const filteredTasks = useMemo(() => {
    const now = new Date();
    const in14Days = new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000);

    let filtered: TaskRecord[];
    switch (view) {
      case "today":
        filtered = tasks.filter((t) => t.bucket === "today" && !t.completed);
        break;
      case "next14":
        filtered = tasks.filter((t) => {
          if (t.completed) return false;
          if (!t.dueDate) return false;
          const d = new Date(t.dueDate);
          return d <= in14Days;
        });
        break;
      case "backlog":
        filtered = tasks.filter((t) => t.bucket === "backlog" && !t.completed);
        break;
      case "someday":
        filtered = tasks.filter((t) => t.bucket === "someday" && !t.completed);
        break;
      default:
        filtered = [];
    }
    return sortTasks(filtered, sortMode);
  }, [tasks, view, sortMode]);

  const handleToggleComplete = useCallback(async (task: TaskRecord) => {
    const newCompleted = !task.completed;
    try {
      await pb.collection("tasks").update(task.id, {
        completed: newCompleted,
        completedAt: newCompleted ? new Date().toISOString() : "",
      });
      setTasks((prev) =>
        prev.map((t) =>
          t.id === task.id
            ? { ...t, completed: newCompleted, completedAt: newCompleted ? new Date().toISOString() : "" }
            : t
        )
      );
    } catch (err) {
      console.error("Toggle failed:", err);
    }
  }, []);

  const handleDelete = useCallback(async (task: TaskRecord) => {
    try {
      await pb.collection("tasks").delete(task.id);
      setTasks((prev) => prev.filter((t) => t.id !== task.id));
    } catch (err) {
      console.error("Delete failed:", err);
    }
  }, []);

  const handleSaved = useCallback(() => {
    setShowForm(false);
    setEditingTask(null);
    fetchTasks();
  }, [fetchTasks]);

  const handleEdit = useCallback((task: TaskRecord) => {
    setEditingTask(task);
    setShowForm(true);
  }, []);

  const cycleSortMode = useCallback(() => {
    setSortMode((prev) => {
      const modes: SortMode[] = ["smart", "dueDate", "createdDate"];
      return modes[(modes.indexOf(prev) + 1) % modes.length];
    });
  }, []);

  const sortLabel = sortMode === "smart" ? "Smart" : sortMode === "dueDate" ? "Due Date" : "Created";

  const viewConfig = {
    today: { icon: Inbox, label: "Today" },
    next14: { icon: CalendarDays, label: "Next 14 Days" },
    backlog: { icon: Archive, label: "Backlog" },
    someday: { icon: Cloud, label: "Someday" },
  };

  const ViewIcon = viewConfig[view].icon;

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="sticky top-0 z-30 bg-background/80 backdrop-blur-md border-b border-border px-4 py-3">
        <div className="flex items-center justify-between max-w-2xl mx-auto">
          <div className="flex items-center gap-2">
            <ViewIcon className="w-5 h-5 text-primary" />
            <h1 className="text-lg font-semibold" data-testid="text-view-title">{viewConfig[view].label}</h1>
            <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded-full" data-testid="text-task-count">
              {filteredTasks.length}
            </span>
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={cycleSortMode}
              className="p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
              title={`Sort: ${sortLabel}`}
              data-testid="button-sort"
            >
              <ArrowUpDown className="w-4 h-4" />
            </button>
            <button
              onClick={() => setShowImportExport(true)}
              className="p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
              data-testid="button-import-export"
            >
              <Upload className="w-4 h-4" />
            </button>
            <button
              onClick={toggleTheme}
              className="p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
              data-testid="button-theme"
            >
              {dark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </button>
            <button
              onClick={onLogout}
              className="p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
              data-testid="button-logout"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>

      <main className="flex-1 overflow-y-auto pb-24">
        <div className="max-w-2xl mx-auto px-4 py-3">
          {loading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
            </div>
          ) : filteredTasks.length === 0 ? (
            <div className="text-center py-16 text-muted-foreground" data-testid="text-empty-state">
              <ViewIcon className="w-10 h-10 mx-auto mb-3 opacity-30" />
              <p className="text-sm">No tasks in this view</p>
              <p className="text-xs mt-1">Tap + to create one</p>
            </div>
          ) : (
            <div className="space-y-2">
              {filteredTasks.map((task) => (
                <TaskCard
                  key={task.id}
                  task={task}
                  onToggleComplete={handleToggleComplete}
                  onEdit={handleEdit}
                  onDelete={handleDelete}
                />
              ))}
            </div>
          )}
        </div>
      </main>

      <button
        onClick={() => { setEditingTask(null); setShowForm(true); }}
        data-testid="button-add-task"
        className="fixed bottom-20 right-4 z-40 w-14 h-14 bg-primary text-primary-foreground rounded-full shadow-lg flex items-center justify-center hover:bg-primary/90 active:scale-95 transition-all"
      >
        <Plus className="w-6 h-6" />
      </button>

      <BottomNav current={view} onChange={setView} />

      {showForm && (
        <TaskForm
          task={editingTask}
          defaultBucket={view === "next14" ? "today" : view}
          onClose={() => { setShowForm(false); setEditingTask(null); }}
          onSaved={handleSaved}
        />
      )}

      {showImportExport && (
        <ImportExport
          onClose={() => setShowImportExport(false)}
          onImported={fetchTasks}
        />
      )}
    </div>
  );
}
