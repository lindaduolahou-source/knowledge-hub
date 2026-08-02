import { BackToExplore } from "@/components/BackToExplore";
import type { Locale } from "@/i18n/config";
import type { Dictionary } from "@/i18n/dictionaries/zh";

interface HubAiPageProps {
  locale: Locale;
  dict: Dictionary;
}

export function HubAiPage({ locale, dict }: HubAiPageProps) {
  return (
    <section className="relative flex min-h-[calc(100dvh-3.5rem)] w-full flex-col px-6 py-12">
      <div className="landing-nebula pointer-events-none absolute inset-0 opacity-70" aria-hidden />
      <BackToExplore locale={locale} label={dict.hub.backToHub} />
      <div className="relative z-10 mx-auto w-full max-w-lg pt-2">
        <h1 className="font-handwrite mb-2 text-3xl text-white sm:text-4xl">
          {dict.hub.aiHelp}
        </h1>
        <p className="mb-6 text-sm leading-relaxed text-white/55">
          {dict.hub.aiHelpBody}
        </p>
        <p className="rounded-xl border border-dashed border-white/20 px-4 py-6 text-sm text-white/40">
          {dict.hub.comingSoon}
        </p>
      </div>
    </section>
  );
}
