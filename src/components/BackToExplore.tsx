import Link from "next/link";
import type { ModuleConfig } from "@/lib/modules";

interface BackToExploreProps {
  locale: string;
  label: string;
  module?: ModuleConfig;
  /** Defaults to hub portal. */
  href?: string;
  /**
   * Pin to the viewport. Defaults to true — all page back links use the
   * same floating control.
   */
  floating?: boolean;
}

export function BackToExplore({
  locale,
  label,
  module,
  href,
  floating = true,
}: BackToExploreProps) {
  const link = (
    <Link
      href={href ?? `/${locale}/hub`}
      className={
        floating
          ? "inline-flex cursor-pointer items-center gap-1.5 rounded-full border border-border/80 bg-background/90 px-3 py-1.5 font-mono text-xs shadow-lg backdrop-blur-md transition-colors hover:border-accent/40 hover:bg-surface"
          : "inline-flex items-center gap-2 font-mono text-xs transition-opacity hover:opacity-80"
      }
      style={floating ? undefined : { color: module?.color ?? "var(--accent)" }}
    >
      ← {label}
    </Link>
  );

  if (!floating) return link;

  return (
    <div className="pointer-events-none fixed top-[4.75rem] left-4 z-40 sm:left-6">
      <div className="pointer-events-auto">{link}</div>
    </div>
  );
}
