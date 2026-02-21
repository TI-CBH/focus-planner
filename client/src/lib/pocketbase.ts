import PocketBase from "pocketbase";

const pbUrl = import.meta.env.VITE_PB_URL || window.location.origin;
const pb = new PocketBase(pbUrl);

pb.autoCancellation(false);

export default pb;

export interface TaskRecord {
  id: string;
  user: string;
  title: string;
  notes: string;
  impact: number;
  effort: number;
  dueDate: string;
  bucket: "today" | "backlog" | "someday";
  tags: string[];
  completed: boolean;
  completedAt: string;
  created: string;
  updated: string;
}
