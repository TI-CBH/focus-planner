import type { TaskRecord } from "./pocketbase";

export function computePriorityScore(task: TaskRecord): number {
  const impactScore = task.impact / 5;
  const effortPenalty = task.effort / 5;
  let baseScore = (impactScore * 2 - effortPenalty) / 2;

  if (task.dueDate) {
    const now = new Date();
    const due = new Date(task.dueDate);
    const daysUntilDue = (due.getTime() - now.getTime()) / (1000 * 60 * 60 * 24);

    if (daysUntilDue < 0) {
      baseScore += 0.5 + Math.min(Math.abs(daysUntilDue) * 0.05, 0.5);
    } else if (daysUntilDue <= 3) {
      baseScore += 0.4;
    } else if (daysUntilDue <= 7) {
      baseScore += 0.2;
    } else if (daysUntilDue <= 14) {
      baseScore += 0.1;
    }
  }

  return Math.round(baseScore * 100) / 100;
}

export type SortMode = "smart" | "dueDate" | "createdDate";

export function sortTasks(tasks: TaskRecord[], mode: SortMode): TaskRecord[] {
  const sorted = [...tasks];
  switch (mode) {
    case "smart":
      return sorted.sort((a, b) => computePriorityScore(b) - computePriorityScore(a));
    case "dueDate":
      return sorted.sort((a, b) => {
        if (!a.dueDate && !b.dueDate) return 0;
        if (!a.dueDate) return 1;
        if (!b.dueDate) return -1;
        return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
      });
    case "createdDate":
      return sorted.sort((a, b) =>
        new Date(b.created).getTime() - new Date(a.created).getTime()
      );
    default:
      return sorted;
  }
}

export function getDueBadge(task: TaskRecord): { label: string; variant: "overdue" | "dueSoon" | "upcoming" } | null {
  if (!task.dueDate) return null;
  const now = new Date();
  const due = new Date(task.dueDate);
  const daysUntilDue = (due.getTime() - now.getTime()) / (1000 * 60 * 60 * 24);

  if (daysUntilDue < 0) return { label: "Overdue", variant: "overdue" };
  if (daysUntilDue <= 3) return { label: "Due soon", variant: "dueSoon" };
  if (daysUntilDue <= 7) return { label: "This week", variant: "upcoming" };
  return null;
}
