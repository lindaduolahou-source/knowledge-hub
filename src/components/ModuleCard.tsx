import Link from "next/link";
import type { ModuleConfig } from "@/lib/modules";

interface ModuleCardProps {
  module: ModuleConfig;
  locale: string;
  title: string;
  description: string;
}

export function ModuleCard({
  module,
  locale,
  title,
  description,
}: ModuleCardProps) {
  return (
    <Link
      href={`/${locale}${module.href}`}
      className={`group relative flex flex-col rounded-xl border ${module.border} ${module.bg} p-6 transition-all duration-300 hover:-translate-y-1 hover:shadow-lg ${module.glow}`}
    >
      <div
        className="absolute inset-x-0 top-0 h-1 rounded-t-xl opacity-80"
        style={{ backgroundColor: module.color }}
      />
      <span
        className="mb-4 font-mono text-2xl"
        style={{ color: module.color }}
      >
        {module.icon}
      </span>
      <h2
        className="mb-2 text-lg font-medium tracking-tight transition-colors group-hover:opacity-90"
        style={{ color: module.color }}
      >
        {title}
      </h2>
      <p className="flex-1 text-sm leading-relaxed text-muted">{description}</p>
      <span
        className="mt-4 font-mono text-xs opacity-60 transition-opacity group-hover:opacity-100"
        style={{ color: module.color }}
      >
        enter →
      </span>
    </Link>
  );
}
