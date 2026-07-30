"use client";

import Link from "next/link";
import type { Dictionary } from "@/i18n/dictionaries/zh";
import type { Locale } from "@/i18n/config";
import { EditableModuleField } from "./EditableModuleField";
import { ModuleDeck } from "./ModuleDeck";

interface LandingPageProps {
  locale: string;
  dict: Dictionary;
}

export function LandingPage({ locale, dict }: LandingPageProps) {
  const loc = locale as Locale;

  return (
    <div className="home-cosmic landing-page relative w-full">
      {/* Hero */}
      <section className="relative flex min-h-[calc(100dvh-3.5rem)] flex-col items-center justify-center overflow-hidden px-6">
        <div className="landing-nebula pointer-events-none absolute inset-0" aria-hidden />
        <div className="landing-vignette pointer-events-none absolute inset-0" aria-hidden />

        <div className="landing-fade-in relative z-10 flex max-w-3xl flex-col items-center text-center">
          <h1 className="font-handwrite mb-3 text-5xl leading-[1.15] text-white sm:mb-5 sm:text-7xl md:text-8xl">
            Knowledge Hub
          </h1>
          <p className="mb-2 text-base text-white/85 sm:mb-3 sm:text-xl">
            {dict.home.title}
          </p>
          <p className="mb-10 text-xs tracking-[0.2em] text-white/55 sm:mb-14 sm:text-sm">
            {dict.home.tagline}
          </p>

          <Link
            href={`/${locale}/explore`}
            className="landing-cta group relative flex h-32 w-32 cursor-pointer items-center justify-center rounded-full border border-white/80 bg-white/10 text-sm text-white backdrop-blur-sm transition-all duration-300 hover:scale-105 hover:bg-white hover:text-black focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-white sm:h-40 sm:w-40 sm:text-base"
            aria-label={dict.home.explore}
          >
            <span className="relative z-10 max-w-[6.5rem] px-3 text-center text-[0.8125rem] leading-snug sm:max-w-[7.5rem] sm:text-sm">
              {dict.home.explore}
            </span>
          </Link>
        </div>

        <div
          className="landing-scroll-hint absolute bottom-8 left-1/2 z-10 -translate-x-1/2"
          aria-hidden
        >
          <span className="block h-10 w-px bg-gradient-to-b from-white/50 to-transparent" />
        </div>
      </section>

      {/* Contents */}
      <section className="relative z-10 border-t border-white/10 bg-black/55 px-6 py-24 backdrop-blur-md">
        <div className="mx-auto max-w-2xl">
          <div className="mb-12 text-center">
            <h2 className="font-handwrite mb-3 text-3xl text-white sm:text-4xl">
              {dict.home.modulesTitle}
            </h2>
            <p className="text-sm text-white/50">{dict.home.modulesSubtitle}</p>
            <p className="mt-2 text-xs text-white/30">{dict.home.editHint}</p>
            <p className="mt-1 text-xs text-white/25">{dict.home.moduleManageHint}</p>
          </div>

          <nav aria-label={dict.home.modulesTitle}>
            <ModuleDeck locale={loc} dict={dict} variant="list" />
          </nav>

          <p className="mt-12 text-center text-sm text-white/40">
            <Link
              href={`/${locale}/explore`}
              className="cursor-pointer underline-offset-4 transition-colors duration-200 hover:text-white hover:underline"
            >
              {dict.home.enterOrbit}
            </Link>
          </p>
        </div>
      </section>

      {/* Closing */}
      <section className="relative z-10 border-t border-white/10 px-6 py-20 text-center">
        <div className="mx-auto mb-8 max-w-xl text-white/90">
          <EditableModuleField
            locale={loc}
            fieldKey="home:closing"
            defaultText={dict.home.closing}
            editHint={dict.home.noteEdit}
            placeholder={dict.home.titlePlaceholder}
            saveHint={dict.home.noteSaveHint}
            rows={2}
            commitOnEnter
            muted={false}
            inheritColor
            textClassName="font-handwrite text-2xl leading-snug sm:text-3xl"
            className="justify-center [&_.min-w-0]:text-center"
          />
        </div>
        <Link
          href={`/${locale}/contact`}
          className="cursor-pointer text-sm text-white/45 underline-offset-4 transition-colors duration-200 hover:text-white hover:underline"
        >
          {dict.nav.contact}
        </Link>
      </section>
    </div>
  );
}
