import { notFound } from "next/navigation";
import { EditableModuleField } from "@/components/EditableModuleField";
import { EditableModuleSections } from "@/components/EditableModuleSections";
import { ModulePageChrome } from "@/components/ModulePageChrome";
import { PageHeader } from "@/components/PageHeader";
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
      title: dict.space.focus,
      body: focusDefault,
    },
    {
      id: "skills",
      variant: "chips",
      title: dict.space.skills,
      body: DEFAULT_SKILLS,
    },
  ];

  return (
    <>
      <ModulePageChrome
        locale={loc}
        dict={dict}
        module={mod}
        backLabel={dict.common.backToExplore}
        titleDefault={dict.space.title}
        shareFields={[
          {
            id: "intro",
            contentKey: "space:intro",
            label: dict.shareCard.fieldIntro,
            defaultText: dict.space.intro,
          },
          {
            id: "focus",
            contentKey: "space:focus",
            label: dict.space.focus,
            defaultText: focusDefault,
          },
          {
            id: "skills",
            contentKey: "space:skills",
            label: dict.space.skills,
            defaultText: DEFAULT_SKILLS,
          },
        ]}
      />
      <PageHeader
        locale={loc}
        moduleId="space"
        title={dict.space.title}
        subtitle={dict.space.subtitle}
        module={mod}
        editHint={dict.home.noteEdit}
        placeholder={dict.home.titlePlaceholder}
        saveHint={dict.home.noteSaveHint}
      />

      <div className="space-y-8">
        <EditableModuleField
          locale={loc}
          fieldKey="space:intro"
          defaultText={dict.space.intro}
          editHint={dict.home.noteEdit}
          placeholder={dict.home.pagePlaceholder}
          saveHint={dict.home.pageSaveHint}
          rows={4}
          className="max-w-2xl"
        />

        <EditableModuleSections
          locale={loc}
          dict={dict}
          moduleId="space"
          accentColor={mod.color}
          defaults={sectionDefaults}
        />
      </div>
    </>
  );
}
