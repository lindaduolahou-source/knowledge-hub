import { notFound } from "next/navigation";
import { ModulePageView } from "@/components/ModulePageView";
import { isValidLocale, type Locale } from "@/i18n/config";
import { getDictionary } from "@/i18n/get-dictionary";
import { getModule } from "@/lib/modules";
import type { ModuleSectionDefault } from "@/lib/module-sections";

const DEFAULT_SKILLS = [
  "Python",
  "TypeScript",
  "Next.js",
  "Writing",
  "Research",
  "Design",
].join("\n");

export default async function SpacePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!isValidLocale(locale)) notFound();

  const loc = locale as Locale;
  const dict = getDictionary(loc);
  const mod = getModule("space");
  const focusDefault = dict.space.focusItems.join("\n");

  const sectionDefaults: ModuleSectionDefault[] = [
    {
      id: "focus",
      variant: "list",
      fields: [],
      coreSlots: ["title", "body"],
      title: dict.space.focus,
      body: focusDefault,
    },
    {
      id: "skills",
      variant: "chips",
      fields: [],
      coreSlots: ["title", "body"],
      title: dict.space.skills,
      body: DEFAULT_SKILLS,
    },
  ];

  return (
    <ModulePageView
      locale={loc}
      dict={dict}
      module={mod}
      titleDefault={dict.space.title}
      subtitleDefault={dict.space.subtitle}
      introDefault={dict.space.intro}
      sectionDefaults={sectionDefaults}
    />
  );
}
