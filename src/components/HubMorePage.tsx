"use client";

import Link from "next/link";
import { BackToExplore } from "@/components/BackToExplore";
import type { Locale } from "@/i18n/config";
import type { Dictionary } from "@/i18n/dictionaries/zh";
import { ModuleDeck } from "@/components/ModuleDeck";

interface HubMorePageProps {
  locale: Locale;
  dict: Dictionary;
}

export function HubMorePage({ locale, dict }: HubMorePageProps) {
  return (
    <section className="relative flex min-h-[calc(100dvh-3.5rem)] w-full flex-col px-6 py-12">
      <div className="landing-nebula pointer-events-none absolute inset-0 opacity-70" aria-hidden />
      <BackToExplore locale={locale} label={dict.hub.backToHub} />
      <div className="relative z-10 mx-auto w-full max-w-lg pt-2">
        <h1 className="font-handwrite mb-8 text-3xl text-white sm:text-4xl">
          {dict.hub.more}
        </h1>
        {dict.hub.morePageHint ? (
          <p className="mb-8 text-sm text-white/45">{dict.hub.morePageHint}</p>
        ) : null}

        <div className="mb-8 space-y-2">
          <Link
            href={`/${locale}/contact`}
            className="flex cursor-pointer items-center justify-between rounded-xl border border-white/15 bg-white/[0.05] px-4 py-3 text-sm text-white/85 transition-colors hover:border-white/30 hover:bg-white/[0.1]"
          >
            <span>{dict.nav.contact}</span>
            <span className="text-white/35">→</span>
          </Link>
          <Link
            href={`/${locale}`}
            className="flex cursor-pointer items-center justify-between rounded-xl border border-white/15 bg-white/[0.05] px-4 py-3 text-sm text-white/85 transition-colors hover:border-white/30 hover:bg-white/[0.1]"
          >
            <span>{dict.hub.backHome}</span>
            <span className="text-white/35">→</span>
          </Link>
        </div>

        <h2 className="mb-3 text-xs tracking-[0.18em] text-white/35 uppercase">
          {dict.home.modulesTitle}
        </h2>
        <ModuleDeck locale={locale} dict={dict} variant="list" />
      </div>
    </section>
  );
}
