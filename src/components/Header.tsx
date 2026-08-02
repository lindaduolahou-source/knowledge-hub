"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { Locale } from "@/i18n/config";
import type { Dictionary } from "@/i18n/dictionaries/zh";
import type { ModuleId } from "@/lib/modules";
import { isBuiltinModuleId } from "@/lib/modules";
import { useModuleLayout } from "@/hooks/useModuleLayout";
import { useModuleTitle } from "@/hooks/useModuleTitle";
import { AuthButton } from "./AuthButton";
import { LanguageSwitcher } from "./LanguageSwitcher";
import { ShareCardModulePicker } from "./ShareCardModulePicker";
import { TrashButton } from "./TrashButton";

interface HeaderProps {
  locale: Locale;
  dict: Dictionary;
}

const navItems: {
  key: keyof Dictionary["nav"];
  href: string;
  moduleId?: ModuleId;
}[] = [
  { key: "home", href: "" },
  { key: "explore", href: "/hub" },
  { key: "space", href: "/space", moduleId: "space" },
  { key: "roadmap", href: "/roadmap", moduleId: "roadmap" },
  { key: "blog", href: "/blog", moduleId: "knowledge" },
  { key: "projects", href: "/projects", moduleId: "lab" },
  { key: "thoughts", href: "/thoughts", moduleId: "thoughts" },
  { key: "contact", href: "/contact", moduleId: "contact" },
];

function ModuleNavLabel({
  locale,
  moduleId,
  defaultTitle,
}: {
  locale: Locale;
  moduleId: ModuleId;
  defaultTitle: string;
}) {
  const title = useModuleTitle(locale, moduleId, defaultTitle);
  return <>{title}</>;
}

export function Header({ locale, dict }: HeaderProps) {
  const pathname = usePathname();
  const { active, ready } = useModuleLayout();
  const activeIds = new Set(active.map((m) => m.id));
  const isLanding =
    pathname === `/${locale}` || pathname === `/${locale}/`;
  const isExplore = pathname.startsWith(`/${locale}/explore`);
  const isHub = pathname.startsWith(`/${locale}/hub`);
  const immersive = isLanding || isExplore || isHub;

  const visibleNav = navItems.filter((item) => {
    // Explore is shown as a dedicated action button beside the share-card control.
    if (item.key === "explore") return false;
    if (!item.moduleId) return true;
    if (!ready) return isBuiltinModuleId(item.moduleId);
    return activeIds.has(item.moduleId);
  });

  return (
    <header
      className={`sticky top-0 z-50 transition-colors duration-300 ${
        immersive
          ? "border-b border-white/10 bg-black/20 backdrop-blur-md"
          : "border-b border-border/60 bg-background/80 backdrop-blur-md"
      }`}
    >
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between gap-3 px-4 sm:px-6">
        <Link
          href={`/${locale}`}
          className={`group flex shrink-0 items-center gap-2 text-sm tracking-wide transition-opacity hover:opacity-80 ${
            immersive ? "text-white" : "text-foreground"
          }`}
        >
          <span className={immersive ? "text-white/60" : "text-accent"}>▸</span>
          <span className="font-handwrite text-base">Knowledge Hub</span>
        </Link>

        <nav className="hidden min-w-0 flex-1 items-center justify-center gap-0.5 overflow-x-auto lg:flex">
          {visibleNav.map((item) => (
            <Link
              key={item.key}
              href={`/${locale}${item.href}`}
              className={`cursor-pointer whitespace-nowrap rounded-md px-2 py-1.5 text-[13px] transition-colors duration-200 ${
                immersive
                  ? "text-white/60 hover:bg-white/10 hover:text-white"
                  : "text-muted hover:bg-surface hover:text-foreground"
              }`}
            >
              {item.moduleId ? (
                <ModuleNavLabel
                  locale={locale}
                  moduleId={item.moduleId}
                  defaultTitle={
                    isBuiltinModuleId(item.moduleId)
                      ? dict.modules[item.moduleId].title
                      : dict.home.newModuleTitle
                  }
                />
              ) : (
                dict.nav[item.key]
              )}
            </Link>
          ))}
        </nav>

        <div className="flex shrink-0 items-center gap-2 sm:gap-3">
          <Link
            href={`/${locale}/hub`}
            className={`cursor-pointer rounded-full px-3 py-1.5 text-xs transition-colors duration-200 ${
              immersive
                ? "border border-white/35 text-white hover:bg-white hover:text-black"
                : "bg-accent/10 text-accent hover:bg-accent/20"
            }`}
          >
            {dict.nav.explore}
          </Link>
          <ShareCardModulePicker
            locale={locale}
            dict={dict}
            immersive={immersive}
          />
          <TrashButton locale={locale} dict={dict} immersive={immersive} />
          <AuthButton locale={locale} dict={dict} immersive={immersive} />
          <LanguageSwitcher locale={locale} />
        </div>
      </div>
    </header>
  );
}
