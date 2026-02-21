import { useState, useRef } from "react";
import pb, { type TaskRecord } from "@/lib/pocketbase";
import { cn } from "@/lib/utils";
import { X, Download, Upload, Loader2 } from "lucide-react";

interface ImportExportProps {
  onClose: () => void;
  onImported: () => void;
}

export default function ImportExport({ onClose, onImported }: ImportExportProps) {
  const [importing, setImporting] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [mergeMode, setMergeMode] = useState<"merge" | "replace">("merge");
  const [message, setMessage] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  async function handleExport() {
    setExporting(true);
    try {
      const tasks = await pb.collection("tasks").getFullList<TaskRecord>({ sort: "-created" });
      const exportData = tasks.map(({ id, user, created, updated, ...rest }) => rest);
      const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `focus-tasks-${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
      setMessage(`Exported ${tasks.length} tasks`);
    } catch (err: any) {
      setMessage("Export failed: " + (err?.message || "Unknown error"));
    } finally {
      setExporting(false);
    }
  }

  async function handleImport() {
    const file = fileInputRef.current?.files?.[0];
    if (!file) {
      setMessage("Please select a file");
      return;
    }

    setImporting(true);
    try {
      const text = await file.text();
      const importedTasks = JSON.parse(text);

      if (!Array.isArray(importedTasks)) {
        throw new Error("Invalid format: expected an array of tasks");
      }

      const userId = pb.authStore.record?.id;

      if (mergeMode === "replace") {
        const existing = await pb.collection("tasks").getFullList<TaskRecord>();
        for (const t of existing) {
          await pb.collection("tasks").delete(t.id);
        }
      }

      let count = 0;
      for (const task of importedTasks) {
        await pb.collection("tasks").create({
          user: userId,
          title: task.title || "Untitled",
          notes: task.notes || "",
          impact: task.impact || 3,
          effort: task.effort || 3,
          dueDate: task.dueDate || "",
          bucket: task.bucket || "backlog",
          tags: task.tags || [],
          completed: task.completed || false,
          completedAt: task.completedAt || "",
        });
        count++;
      }

      setMessage(`Imported ${count} tasks (${mergeMode} mode)`);
      onImported();
    } catch (err: any) {
      setMessage("Import failed: " + (err?.message || "Unknown error"));
    } finally {
      setImporting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-end sm:items-center justify-center" onClick={onClose}>
      <div
        onClick={(e) => e.stopPropagation()}
        className="bg-background w-full max-w-md rounded-t-2xl sm:rounded-2xl border border-border"
      >
        <div className="border-b border-border px-4 py-3 flex items-center justify-between">
          <h2 className="font-semibold">Import / Export</h2>
          <button onClick={onClose} className="p-1 rounded-md hover:bg-muted" data-testid="button-close-import-export">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-4 space-y-4">
          {message && (
            <div className="text-sm bg-muted rounded-lg p-3" data-testid="text-import-export-message">{message}</div>
          )}

          <div className="space-y-2">
            <h3 className="text-sm font-medium">Export</h3>
            <button
              onClick={handleExport}
              disabled={exporting}
              data-testid="button-export"
              className={cn(
                "w-full py-2 rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-2",
                "bg-primary text-primary-foreground hover:bg-primary/90",
                "disabled:opacity-50"
              )}
            >
              {exporting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
              Download Tasks as JSON
            </button>
          </div>

          <div className="border-t border-border" />

          <div className="space-y-3">
            <h3 className="text-sm font-medium">Import</h3>
            <div className="flex gap-2">
              <button
                onClick={() => setMergeMode("merge")}
                data-testid="button-merge-mode"
                className={cn(
                  "flex-1 py-1.5 rounded-lg text-xs font-medium border transition-colors",
                  mergeMode === "merge"
                    ? "border-primary text-primary bg-primary/10"
                    : "border-border text-muted-foreground hover:text-foreground"
                )}
              >
                Merge
              </button>
              <button
                onClick={() => setMergeMode("replace")}
                data-testid="button-replace-mode"
                className={cn(
                  "flex-1 py-1.5 rounded-lg text-xs font-medium border transition-colors",
                  mergeMode === "replace"
                    ? "border-destructive text-destructive bg-destructive/10"
                    : "border-border text-muted-foreground hover:text-foreground"
                )}
              >
                Replace All
              </button>
            </div>

            <input
              ref={fileInputRef}
              type="file"
              accept=".json"
              data-testid="input-import-file"
              className="w-full text-sm file:mr-2 file:px-3 file:py-1.5 file:rounded-md file:border-0 file:bg-muted file:text-sm file:font-medium hover:file:bg-muted/80"
            />

            <button
              onClick={handleImport}
              disabled={importing}
              data-testid="button-import"
              className={cn(
                "w-full py-2 rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-2",
                "bg-secondary text-secondary-foreground hover:bg-secondary/80",
                "disabled:opacity-50"
              )}
            >
              {importing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
              Import Tasks
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
