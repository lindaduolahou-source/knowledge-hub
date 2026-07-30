import Link from "next/link";
import type { ModuleConfig } from "@/lib/modules";

interface BackToExploreProps {
  locale: string;
  label: string;
  module?: ModuleConfig;
}

export function BackToExplore({ locale, label, module }: BackToExploreProps) {
  return (
    <Link
      href={`/${locale}/explore`}
      className="inline-flex items-center gap-2 font-mono text-xs transition-opacity hover:opacity-80"
      style={{ color: module?.color ?? "var(--accent)" }}
    >
      ← {label}
    </Link>
  );
}
