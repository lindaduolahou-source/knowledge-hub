import Link from "next/link";
import { notFound } from "next/navigation";
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

      <div className="relative z-10 mb-4 flex w-full max-w-3xl items-center justify-between px-2 sm:mb-6">
        <Link
          href={`/${locale}`}
          className="cursor-pointer text-xs text-white/50 transition-colors hover:text-white"
        >
          ← {dict.explore.back}
        </Link>
        <p className="hidden text-[10px] tracking-[0.2em] text-white/35 uppercase sm:block">
          {dict.explore.subtitle}
        </p>
      </div>

      <ExploreSystemMap locale={locale} dict={dict} />
    </section>
  );
}
