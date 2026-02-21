import { useState } from "react";
import { cn } from "@/lib/utils";
import { getDueBadge, computePriorityScore } from "@/lib/priority";
import type { TaskRecord } from "@/lib/pocketbase";
import { format } from "date-fns";
import { Check, Pencil, Trash2, ChevronDown, ChevronUp, Zap, Dumbbell, Calendar } from "lucide-react";

interface TaskCardProps {
  task: TaskRecord;
  onToggleComplete: (task: TaskRecord) => void;
  onEdit: (task: TaskRecord) => void;
  onDelete: (task: TaskRecord) => void;
}

export default function TaskCard({ task, onToggleComplete, onEdit, onDelete }: TaskCardProps) {
  const [expanded, setExpanded] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const badge = getDueBadge(task);
  const score = computePriorityScore(task);

  return (
    <div
      data-testid={`card-task-${task.id}`}
      className={cn(
        "bg-card border border-border rounded-xl p-3 transition-all",
        task.completed && "opacity-50"
      )}
    >
      <div className="flex items-start gap-3">
        <button
          onClick={() => onToggleComplete(task)}
          data-testid={`button-complete-${task.id}`}
          className={cn(
            "mt-0.5 w-5 h-5 rounded-md border-2 flex items-center justify-center flex-shrink-0 transition-colors",
            task.completed
              ? "bg-primary border-primary text-primary-foreground"
              : "border-muted-foreground/40 hover:border-primary"
          )}
        >
          {task.completed && <Check className="w-3 h-3" />}
        </button>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <p
              className={cn("font-medium text-sm leading-snug truncate", task.completed && "line-through")}
              data-testid={`text-task-title-${task.id}`}
            >
              {task.title}
            </p>
            {badge && (
              <span
                className={cn(
                  "text-[10px] px-1.5 py-0.5 rounded-full font-medium flex-shrink-0",
                  badge.variant === "overdue" && "bg-destructive/15 text-destructive",
                  badge.variant === "dueSoon" && "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400",
                  badge.variant === "upcoming" && "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400"
                )}
                data-testid={`badge-due-${task.id}`}
              >
                {badge.label}
              </span>
            )}
          </div>

          <div className="flex items-center gap-3 mt-1 text-[11px] text-muted-foreground">
            <span className="flex items-center gap-0.5" title="Impact">
              <Zap className="w-3 h-3" /> {task.impact}
            </span>
            <span className="flex items-center gap-0.5" title="Effort">
              <Dumbbell className="w-3 h-3" /> {task.effort}
            </span>
            {task.dueDate && (
              <span className="flex items-center gap-0.5">
                <Calendar className="w-3 h-3" /> {format(new Date(task.dueDate), "MMM d")}
              </span>
            )}
            <span className="text-primary/70 font-medium" title="Priority score">
              {score.toFixed(1)}
            </span>
          </div>

          {task.tags && task.tags.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-1.5">
              {task.tags.map((tag) => (
                <span key={tag} className="text-[10px] px-1.5 py-0.5 bg-muted rounded-md text-muted-foreground">
                  {tag}
                </span>
              ))}
            </div>
          )}
        </div>

        <div className="flex items-center gap-0.5 flex-shrink-0">
          {task.notes && (
            <button
              onClick={() => setExpanded(!expanded)}
              className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
              data-testid={`button-expand-${task.id}`}
            >
              {expanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            </button>
          )}
          <button
            onClick={() => onEdit(task)}
            className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
            data-testid={`button-edit-${task.id}`}
          >
            <Pencil className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => {
              if (confirmDelete) {
                onDelete(task);
                setConfirmDelete(false);
              } else {
                setConfirmDelete(true);
                setTimeout(() => setConfirmDelete(false), 3000);
              }
            }}
            className={cn(
              "p-1.5 rounded-md transition-colors",
              confirmDelete
                ? "text-destructive bg-destructive/10"
                : "text-muted-foreground hover:text-destructive hover:bg-destructive/10"
            )}
            data-testid={`button-delete-${task.id}`}
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {expanded && task.notes && (
        <div
          className="mt-3 pt-3 border-t border-border text-sm prose prose-sm dark:prose-invert max-w-none"
          dangerouslySetInnerHTML={{ __html: task.notes }}
          data-testid={`text-task-notes-${task.id}`}
        />
      )}
    </div>
  );
}
