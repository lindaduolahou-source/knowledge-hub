import { notFound } from "next/navigation";
import { ModulePageView } from "@/components/ModulePageView";
import { isValidLocale, type Locale } from "@/i18n/config";
import { getDictionary } from "@/i18n/get-dictionary";
import { getThoughts } from "@/lib/content";
import { getModule } from "@/lib/modules";

export default async function ThoughtsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!isValidLocale(locale)) notFound();

  const loc = locale as Locale;
  const dict = getDictionary(loc);
  const thoughts = getThoughts(loc);
  const mod = getModule("thoughts");

  return (
    <ModulePageView
      locale={loc}
      dict={dict}
      module={mod}
      titleDefault={dict.thoughts.title}
      subtitleDefault={dict.thoughts.subtitle}
      introDefault={dict.modules.thoughts.description}
      posts={thoughts}
      addFeatures={{ postDefaults: thoughts }}
    />
  );
}
