"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { Locale } from "@/i18n/config";
import type { Dictionary } from "@/i18n/dictionaries/zh";
import { AuthButton } from "./AuthButton";
import { LanguageSwitcher } from "./LanguageSwitcher";
import { ShareCardModulePicker } from "./ShareCardModulePicker";
import { TrashButton } from "./TrashButton";

interface HeaderProps {
  locale: Locale;
  dict: Dictionary;
}

const hubNavItems: {
  id: string;
  href: string;
  labelKey: "exploreSpace" | "cards" | "aiHelp" | "more";
}[] = [
  { id: "explore", href: "/explore", labelKey: "exploreSpace" },
  { id: "cards", href: "/hub/cards", labelKey: "cards" },
  { id: "ai", href: "/hub/ai", labelKey: "aiHelp" },
  { id: "more", href: "/hub/more", labelKey: "more" },
];

export function Header({ locale, dict }: HeaderProps) {
  const pathname = usePathname();
  const isLanding =
    pathname === `/${locale}` || pathname === `/${locale}/`;
  const isExplore = pathname.startsWith(`/${locale}/explore`);
  const isHub = pathname.startsWith(`/${locale}/hub`);
  const immersive = isLanding || isExplore || isHub;

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

        <nav className="hidden min-w-0 flex-1 items-center justify-center gap-0.5 overflow-x-auto sm:flex">
          {hubNavItems.map((item) => {
            const href = `/${locale}${item.href}`;
            const active =
              pathname === href || pathname.startsWith(`${href}/`);
            return (
              <Link
                key={item.id}
                href={href}
                className={`cursor-pointer whitespace-nowrap rounded-md px-2 py-1.5 text-[13px] transition-colors duration-200 ${
                  immersive
                    ? active
                      ? "bg-white/10 text-white"
                      : "text-white/60 hover:bg-white/10 hover:text-white"
                    : active
                      ? "bg-surface text-foreground"
                      : "text-muted hover:bg-surface hover:text-foreground"
                }`}
              >
                {dict.hub[item.labelKey]}
              </Link>
            );
          })}
        </nav>

        <div className="flex shrink-0 items-center gap-2 sm:gap-3">
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
