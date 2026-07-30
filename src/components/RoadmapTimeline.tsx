import type { RoadmapItem } from "@/lib/content";
import type { Dictionary } from "@/i18n/dictionaries/zh";

interface RoadmapTimelineProps {
  items: RoadmapItem[];
  dict: Dictionary;
}

const statusStyles = {
  completed: "border-white/20 bg-white/10 text-white/80",
  inProgress: "border-white/15 bg-white/5 text-white/60",
  planned: "border-border bg-surface text-muted",
};

export function RoadmapTimeline({ items, dict }: RoadmapTimelineProps) {
  return (
    <div className="relative space-y-0">
      <div className="absolute left-[11px] top-2 bottom-2 w-px bg-border" />
      {items.map((item, i) => (
        <div key={item.id} className="relative flex gap-6 pb-10 last:pb-0">
          <div className="relative z-10 mt-1.5 flex h-[22px] w-[22px] shrink-0 items-center justify-center rounded-full border border-border bg-background">
            <div
              className={`h-2 w-2 rounded-full ${
                item.status === "completed"
                  ? "bg-accent"
                  : item.status === "inProgress"
                    ? "bg-white/50"
                    : "bg-muted/40"
              }`}
            />
          </div>
          <div className="flex-1 rounded-lg border border-border bg-surface/50 p-5 transition-colors hover:border-accent/20">
            <div className="mb-2 flex flex-wrap items-center gap-2">
              <span className="font-mono text-xs text-muted/60">
                {String(i + 1).padStart(2, "0")}
              </span>
              <span
                className={`rounded px-2 py-0.5 font-mono text-xs ${statusStyles[item.status]}`}
              >
                {dict.roadmap.status[item.status]}
              </span>
            </div>
            <h3 className="mb-2 text-base font-medium text-foreground">
              {item.title}
            </h3>
            <p className="mb-3 text-sm leading-relaxed text-muted">
              {item.description}
            </p>
            <div className="flex flex-wrap gap-1.5">
              {item.topics.map((topic) => (
                <span
                  key={topic}
                  className="rounded bg-accent/5 px-1.5 py-0.5 font-mono text-xs text-accent/80"
                >
                  {topic}
                </span>
              ))}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
