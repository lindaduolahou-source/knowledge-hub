import Link from "next/link";
import type { Dictionary } from "@/i18n/dictionaries/zh";

interface LandingPageProps {
  locale: string;
  dict: Dictionary;
}

export function LandingPage({ locale, dict }: LandingPageProps) {
  return (
    <div className="home-cosmic landing-page relative w-full">
      <section className="relative flex min-h-[calc(100dvh-3.5rem)] flex-col items-center justify-center overflow-hidden px-6">
        <div
          className="landing-nebula pointer-events-none absolute inset-0"
          aria-hidden
        />
        <div
          className="landing-vignette pointer-events-none absolute inset-0"
          aria-hidden
        />

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
            href={`/${locale}/hub`}
            className="landing-cta group relative flex h-32 w-32 cursor-pointer items-center justify-center rounded-full border border-white/80 bg-white/10 text-sm text-white backdrop-blur-sm transition-all duration-300 hover:scale-105 hover:bg-white hover:text-black focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-white sm:h-40 sm:w-40 sm:text-base"
            aria-label={dict.home.explore}
          >
            <span className="relative z-10 max-w-[6.5rem] px-3 text-center text-[0.8125rem] leading-snug sm:max-w-[7.5rem] sm:text-sm">
              {dict.home.explore}
            </span>
          </Link>
        </div>
      </section>
    </div>
  );
}
