import { notFound } from "next/navigation";
import { EditableModuleField } from "@/components/EditableModuleField";
import { ModulePageChrome } from "@/components/ModulePageChrome";
import { PageHeader } from "@/components/PageHeader";
import { RoadmapTimeline } from "@/components/RoadmapTimeline";
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
    <>
      <ModulePageChrome
        locale={loc}
        dict={dict}
        module={mod}
        backLabel={dict.common.backToExplore}
        titleDefault={dict.roadmap.title}
        shareFields={[
          {
            id: "intro",
            contentKey: "roadmap:intro",
            label: dict.shareCard.fieldIntro,
            defaultText: dict.modules.roadmap.description,
          },
        ]}
      />
      <PageHeader
        locale={loc}
        moduleId="roadmap"
        title={dict.roadmap.title}
        subtitle={dict.roadmap.subtitle}
        module={mod}
        editHint={dict.home.noteEdit}
        placeholder={dict.home.titlePlaceholder}
        saveHint={dict.home.noteSaveHint}
      />
      <EditableModuleField
        locale={loc}
        fieldKey="roadmap:intro"
        defaultText={dict.modules.roadmap.description}
        editHint={dict.home.noteEdit}
        placeholder={dict.home.pagePlaceholder}
        saveHint={dict.home.pageSaveHint}
        rows={3}
        className="mb-8 max-w-2xl"
      />
      <RoadmapTimeline items={items} dict={dict} />
    </>
  );
}
