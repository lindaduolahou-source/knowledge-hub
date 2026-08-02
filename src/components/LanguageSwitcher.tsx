"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { Locale } from "@/i18n/config";
import { locales } from "@/i18n/config";

interface LanguageSwitcherProps {
  locale: Locale;
}

export function LanguageSwitcher({ locale }: LanguageSwitcherProps) {
  const pathname = usePathname();
  const isLanding =
    pathname === `/${locale}` || pathname === `/${locale}/`;
  const isExplore = pathname.startsWith(`/${locale}/explore`);
  const isHub = pathname.startsWith(`/${locale}/hub`);
  const immersive = isLanding || isExplore || isHub;

  function getHref(target: Locale) {
    const segments = pathname.split("/").filter(Boolean);
    if (segments.length > 0 && locales.includes(segments[0] as Locale)) {
      segments[0] = target;
    } else {
      segments.unshift(target);
    }
    return `/${segments.join("/")}`;
  }

  return (
    <div
      className={`flex items-center gap-0.5 rounded-full border p-0.5 text-xs ${
        immersive
          ? "border-white/25 bg-white/10"
          : "border-border bg-surface"
      }`}
    >
      {locales.map((loc) => (
        <Link
          key={loc}
          href={getHref(loc)}
          className={`cursor-pointer rounded-full px-2 py-1 uppercase transition-colors duration-200 ${
            loc === locale
              ? immersive
                ? "bg-white text-black"
                : "bg-accent/15 text-accent"
              : immersive
                ? "text-white/60 hover:text-white"
                : "text-muted hover:text-foreground"
          }`}
        >
          {loc}
        </Link>
      ))}
    </div>
  );
}
