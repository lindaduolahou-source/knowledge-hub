import { notFound } from "next/navigation";
import { EditableModuleField } from "@/components/EditableModuleField";
import { EditableModuleSections } from "@/components/EditableModuleSections";
import { EditablePostGrid } from "@/components/EditablePostGrid";
import { EditableProjectGrid } from "@/components/EditableProjectGrid";
import { ModuleAddMenu } from "@/components/ModuleAddMenu";
import { ModulePageChrome } from "@/components/ModulePageChrome";
import { PageHeader } from "@/components/PageHeader";
import { RoadmapTimeline } from "@/components/RoadmapTimeline";
import { isValidLocale, type Locale } from "@/i18n/config";
import { getDictionary } from "@/i18n/get-dictionary";
import { getProjects } from "@/lib/content";
import { getModule } from "@/lib/modules";
import {
  postCollectionForModule,
  postHrefPrefixForModule,
} from "@/lib/post-edits";

export default async function ProjectsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!isValidLocale(locale)) notFound();

  const loc = locale as Locale;
  const dict = getDictionary(loc);
  const projects = getProjects(loc);
  const mod = getModule("lab");

  return (
    <>
      <ModulePageChrome
        locale={loc}
        dict={dict}
        module={mod}
        backLabel={dict.common.backToExplore}
        titleDefault={dict.projects.title}
        shareFields={[
          {
            id: "intro",
            contentKey: "lab:intro",
            label: dict.shareCard.fieldIntro,
            defaultText: dict.modules.lab.description,
          },
        ]}
      />
      <PageHeader
        locale={loc}
        moduleId="lab"
        title={dict.projects.title}
        subtitle={dict.projects.subtitle}
        module={mod}
        editHint={dict.home.noteEdit}
        placeholder={dict.home.titlePlaceholder}
        saveHint={dict.home.noteSaveHint}
      />
      <div className="space-y-8">
        <EditableModuleField
          locale={loc}
          fieldKey="lab:intro"
          defaultText={dict.modules.lab.description}
          editHint={dict.home.noteEdit}
          placeholder={dict.home.pagePlaceholder}
          saveHint={dict.home.pageSaveHint}
          rows={3}
          className="max-w-2xl"
        />
        <EditableModuleSections
          locale={loc}
          dict={dict}
          moduleId="lab"
          accentColor={mod.color}
          defaults={[]}
          hideAdd
        />
        <EditableProjectGrid
          locale={loc}
          dict={dict}
          moduleId="lab"
          projects={projects}
          hideAdd
        />
        <EditablePostGrid
          locale={loc}
          dict={dict}
          collection={postCollectionForModule("lab")}
          posts={[]}
          hrefPrefix={postHrefPrefixForModule("lab")}
          readMore={dict.blog.readMore}
          hideAdd
        />
        <RoadmapTimeline locale={loc} moduleId="lab" dict={dict} hideAdd />
        <ModuleAddMenu
          locale={loc}
          dict={dict}
          moduleId="lab"
          features={{ projectDefaults: projects }}
        />
      </div>
    </>
  );
}
