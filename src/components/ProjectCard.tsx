import { Code, ExternalLink } from "lucide-react";
import type { Project } from "@/lib/content";

interface ProjectCardProps {
  project: Project;
  techLabel: string;
}

export function ProjectCard({ project, techLabel }: ProjectCardProps) {
  return (
    <article className="group rounded-lg border border-border bg-surface/50 p-5 transition-all hover:border-accent/30 hover:bg-surface">
      <div className="mb-3 flex items-start justify-between">
        <h3 className="text-lg font-medium tracking-tight text-foreground group-hover:text-accent transition-colors">
          {project.title}
        </h3>
        <div className="flex gap-2">
          {project.github && (
            <a
              href={project.github}
              target="_blank"
              rel="noopener noreferrer"
              className="text-muted hover:text-accent transition-colors"
              aria-label="GitHub"
            >
              <Code size={16} />
            </a>
          )}
          {project.demo && (
            <a
              href={project.demo}
              target="_blank"
              rel="noopener noreferrer"
              className="text-muted hover:text-accent transition-colors"
              aria-label="Demo"
            >
              <ExternalLink size={16} />
            </a>
          )}
        </div>
      </div>
      <p className="mb-4 text-sm leading-relaxed text-muted">
        {project.description}
      </p>
      <div className="flex flex-wrap gap-1.5">
        <span className="font-mono text-xs text-muted/60">{techLabel}:</span>
        {project.tags.map((tag) => (
          <span
            key={tag}
            className="rounded bg-accent/10 px-1.5 py-0.5 font-mono text-xs text-accent"
          >
            {tag}
          </span>
        ))}
      </div>
    </article>
  );
}
