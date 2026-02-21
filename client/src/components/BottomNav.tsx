import { cn } from "@/lib/utils";
import { Inbox, CalendarDays, Archive, Cloud } from "lucide-react";

type View = "today" | "next14" | "backlog" | "someday";

const tabs: { id: View; label: string; Icon: typeof Inbox }[] = [
  { id: "today", label: "Today", Icon: Inbox },
  { id: "next14", label: "14 Days", Icon: CalendarDays },
  { id: "backlog", label: "Backlog", Icon: Archive },
  { id: "someday", label: "Someday", Icon: Cloud },
];

interface BottomNavProps {
  current: View;
  onChange: (view: View) => void;
}

export default function BottomNav({ current, onChange }: BottomNavProps) {
  return (
    <nav className="fixed bottom-0 inset-x-0 z-50 bg-background/80 backdrop-blur-md border-t border-border">
      <div className="max-w-2xl mx-auto flex">
        {tabs.map(({ id, label, Icon }) => (
          <button
            key={id}
            onClick={() => onChange(id)}
            data-testid={`nav-${id}`}
            className={cn(
              "flex-1 flex flex-col items-center gap-0.5 py-2 text-xs transition-colors",
              current === id
                ? "text-primary font-medium"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            <Icon className="w-5 h-5" />
            <span>{label}</span>
          </button>
        ))}
      </div>
    </nav>
  );
}
