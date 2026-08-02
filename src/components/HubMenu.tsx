"use client";

import Link from "next/link";
import { BackToExplore } from "@/components/BackToExplore";
import type { Locale } from "@/i18n/config";
import type { Dictionary } from "@/i18n/dictionaries/zh";

interface HubMenuProps {
  locale: Locale;
  dict: Dictionary;
}

const ACTIONS = [
  {
    id: "explore",
    href: (locale: string) => `/${locale}/explore`,
    labelKey: "exploreSpace" as const,
    hintKey: "exploreSpaceHint" as const,
  },
  {
    id: "cards",
    href: (locale: string) => `/${locale}/hub/cards`,
    labelKey: "cards" as const,
    hintKey: "cardsHint" as const,
  },
  {
    id: "ai",
    href: (locale: string) => `/${locale}/hub/ai`,
    labelKey: "aiHelp" as const,
    hintKey: "aiHelpHint" as const,
  },
  {
    id: "more",
    href: (locale: string) => `/${locale}/hub/more`,
    labelKey: "more" as const,
    hintKey: "moreHint" as const,
  },
] as const;

export function HubMenu({ locale, dict }: HubMenuProps) {
  return (
    <section className="hub-portal relative flex min-h-[calc(100dvh-3.5rem)] w-full flex-col items-center justify-center overflow-hidden px-6 py-16">
      <div className="landing-nebula pointer-events-none absolute inset-0 opacity-80" aria-hidden />
      <div className="landing-vignette pointer-events-none absolute inset-0" aria-hidden />

      <BackToExplore
        locale={locale}
        label={dict.hub.back}
        href={`/${locale}`}
      />

      <div className="relative z-10 w-full max-w-md">
        <div className="mb-10 flex justify-end">
          <p className="text-[10px] tracking-[0.22em] text-white/35 uppercase">
            {dict.hub.eyebrow}
          </p>
        </div>

        <div className="hub-fade-in mb-10 text-center">
          <p className="font-handwrite mb-2 text-4xl text-white sm:text-5xl">
            Knowledge Hub
          </p>
          <h1 className="text-sm text-white/70 sm:text-base">{dict.hub.title}</h1>
        </div>

        <nav
          aria-label={dict.hub.title}
          className="hub-actions flex flex-col gap-3"
        >
          {ACTIONS.map((action, index) => (
            <Link
              key={action.id}
              href={action.href(locale)}
              className="hub-action group flex cursor-pointer items-center justify-between gap-4 rounded-2xl border border-white/20 bg-white/[0.06] px-5 py-4 text-left backdrop-blur-sm transition-all duration-300 hover:border-white/45 hover:bg-white/[0.12]"
              style={{ animationDelay: `${120 + index * 70}ms` }}
            >
              <span className="min-w-0">
                <span className="block text-base text-white transition-colors group-hover:text-white">
                  {dict.hub[action.labelKey]}
                </span>
                {dict.hub[action.hintKey] ? (
                  <span className="mt-0.5 block text-xs text-white/40">
                    {dict.hub[action.hintKey]}
                  </span>
                ) : null}
              </span>
              <span
                className="shrink-0 text-white/35 transition-transform duration-300 group-hover:translate-x-0.5 group-hover:text-white/70"
                aria-hidden
              >
                →
              </span>
            </Link>
          ))}
        </nav>
      </div>
    </section>
  );
}
