"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { CloudSyncProvider } from "@/components/CloudSyncProvider";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { isValidLocale, type Locale } from "@/i18n/config";
import type { Dictionary } from "@/i18n/dictionaries/zh";

interface LocaleShellProps {
  locale: string;
  dict: Dictionary;
  children: React.ReactNode;
}

export function LocaleShell({ locale, dict, children }: LocaleShellProps) {
  const pathname = usePathname();
  const valid = isValidLocale(locale);
  const isLanding =
    valid && (pathname === `/${locale}` || pathname === `/${locale}/`);
  const isImmersive =
    isLanding ||
    (valid &&
      (pathname.startsWith(`/${locale}/explore`) ||
        pathname.startsWith(`/${locale}/hub`)));

  useEffect(() => {
    document.documentElement.lang = locale;
  }, [locale]);

  return (
    <CloudSyncProvider>
      <div
        className={`flex min-h-full flex-col ${isImmersive ? "" : "grid-bg"}`}
        data-landing={isLanding ? "" : undefined}
        data-immersive={isImmersive ? "" : undefined}
      >
        {!isImmersive && (
          <div className="glow-accent pointer-events-none fixed inset-0 -z-10" />
        )}
        <Header locale={locale as Locale} dict={dict} />
        <main
          className={
            isImmersive
              ? "w-full flex-1"
              : "mx-auto w-full max-w-5xl flex-1 px-6 py-10"
          }
        >
          {children}
        </main>
        <Footer dict={dict} />
      </div>
    </CloudSyncProvider>
  );
}
