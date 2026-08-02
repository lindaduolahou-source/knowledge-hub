import { notFound } from "next/navigation";
import { ModulePageView } from "@/components/ModulePageView";
import { isValidLocale, type Locale } from "@/i18n/config";
import { getDictionary } from "@/i18n/get-dictionary";
import { getRoadmap } from "@/lib/content";
import { getModule } from "@/lib/modules";

export default async function RoadmapPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!isValidLocale(locale)) notFound();

  const loc = locale as Locale;
  const dict = getDictionary(loc);
  const items = getRoadmap(loc);
  const mod = getModule("roadmap");

  return (
    <ModulePageView
      locale={loc}
      dict={dict}
      module={mod}
      titleDefault={dict.roadmap.title}
      subtitleDefault={dict.roadmap.subtitle}
      introDefault={dict.modules.roadmap.description}
      roadmapItems={items}
      addFeatures={{ roadmapDefaults: items }}
    />
  );
}
