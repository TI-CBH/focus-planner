import { useState, useEffect } from "react";
import pb, { type TaskRecord } from "@/lib/pocketbase";
import { cn } from "@/lib/utils";
import { X, Loader2 } from "lucide-react";

interface TaskFormProps {
  task: TaskRecord | null;
  defaultBucket: string;
  onClose: () => void;
  onSaved: () => void;
}

export default function TaskForm({ task, defaultBucket, onClose, onSaved }: TaskFormProps) {
  const isEdit = !!task;

  const [title, setTitle] = useState(task?.title || "");
  const [notes, setNotes] = useState(task?.notes || "");
  const [impact, setImpact] = useState(task?.impact || 3);
  const [effort, setEffort] = useState(task?.effort || 3);
  const [dueDate, setDueDate] = useState(task?.dueDate ? task.dueDate.slice(0, 10) : "");
  const [bucket, setBucket] = useState<string>(task?.bucket || defaultBucket);
  const [tagsInput, setTagsInput] = useState(task?.tags?.join(", ") || "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = ""; };
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (!title.trim()) {
      setError("Title is required");
      return;
    }

    setSaving(true);
    const tags = tagsInput
      .split(",")
      .map((t) => t.trim())
      .filter(Boolean);

    const data: Record<string, any> = {
      title: title.trim(),
      notes,
      impact,
      effort,
      dueDate: dueDate ? new Date(dueDate).toISOString() : "",
      bucket: bucket as "today" | "backlog" | "someday",
      tags,
    };

    try {
      if (isEdit) {
        await pb.collection("tasks").update(task!.id, data);
      } else {
        data.user = pb.authStore.record?.id;
        data.completed = false;
        await pb.collection("tasks").create(data);
      }
      onSaved();
    } catch (err: any) {
      setError(err?.message || "Save failed");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-end sm:items-center justify-center" onClick={onClose}>
      <div
        onClick={(e) => e.stopPropagation()}
        className="bg-background w-full max-w-lg rounded-t-2xl sm:rounded-2xl max-h-[90vh] overflow-y-auto border border-border"
      >
        <div className="sticky top-0 bg-background border-b border-border px-4 py-3 flex items-center justify-between z-10">
          <h2 className="font-semibold" data-testid="text-form-title">{isEdit ? "Edit Task" : "New Task"}</h2>
          <button onClick={onClose} className="p-1 rounded-md hover:bg-muted" data-testid="button-close-form">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          {error && (
            <div className="bg-destructive/10 text-destructive text-sm rounded-lg p-3" data-testid="text-form-error">
              {error}
            </div>
          )}

          <div className="space-y-1.5">
            <label className="text-sm font-medium">Title</label>
            <input
              data-testid="input-task-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-3 py-2 bg-card border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
              placeholder="What needs to be done?"
              autoFocus
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-medium">Notes (markdown)</label>
            <textarea
              data-testid="input-task-notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full px-3 py-2 bg-card border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/40 min-h-[80px] resize-y"
              placeholder="Additional details..."
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Impact ({impact}/5)</label>
              <input
                data-testid="input-impact"
                type="range"
                min="1"
                max="5"
                value={impact}
                onChange={(e) => setImpact(Number(e.target.value))}
                className="w-full accent-primary"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Effort ({effort}/5)</label>
              <input
                data-testid="input-effort"
                type="range"
                min="1"
                max="5"
                value={effort}
                onChange={(e) => setEffort(Number(e.target.value))}
                className="w-full accent-primary"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Due Date</label>
              <input
                data-testid="input-due-date"
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="w-full px-3 py-2 bg-card border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Bucket</label>
              <select
                data-testid="select-bucket"
                value={bucket}
                onChange={(e) => setBucket(e.target.value)}
                className="w-full px-3 py-2 bg-card border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
              >
                <option value="today">Today</option>
                <option value="backlog">Backlog</option>
                <option value="someday">Someday</option>
              </select>
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-medium">Tags (comma-separated)</label>
            <input
              data-testid="input-tags"
              value={tagsInput}
              onChange={(e) => setTagsInput(e.target.value)}
              className="w-full px-3 py-2 bg-card border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
              placeholder="work, urgent, personal"
            />
          </div>

          <button
            type="submit"
            disabled={saving}
            data-testid="button-save-task"
            className={cn(
              "w-full py-2.5 rounded-lg font-medium text-sm transition-colors",
              "bg-primary text-primary-foreground hover:bg-primary/90",
              "disabled:opacity-50 disabled:cursor-not-allowed",
              "flex items-center justify-center gap-2"
            )}
          >
            {saving && <Loader2 className="w-4 h-4 animate-spin" />}
            {isEdit ? "Save Changes" : "Create Task"}
          </button>
        </form>
      </div>
    </div>
  );
}
