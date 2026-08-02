import { notFound } from "next/navigation";
import { BackToExplore } from "@/components/BackToExplore";
import { ExploreSystemMap } from "@/components/ExploreSystemMap";
import { isValidLocale, type Locale } from "@/i18n/config";
import { getDictionary } from "@/i18n/get-dictionary";

export default async function ExplorePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!isValidLocale(locale)) notFound();

  const dict = getDictionary(locale as Locale);

  return (
    <section className="explore-tech relative flex min-h-[calc(100dvh-3.5rem)] w-full flex-col items-center justify-center px-3 py-10 sm:px-6">
      <div className="explore-tech-grid pointer-events-none absolute inset-0" aria-hidden />
      <div className="explore-tech-glow pointer-events-none absolute inset-0" aria-hidden />

      <BackToExplore locale={locale} label={dict.hub.backToHub} />

      <ExploreSystemMap locale={locale} dict={dict} />
    </section>
  );
}
