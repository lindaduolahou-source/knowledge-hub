import { notFound } from "next/navigation";
import { EditableModuleField } from "@/components/EditableModuleField";
import { ModulePageChrome } from "@/components/ModulePageChrome";
import { PageHeader } from "@/components/PageHeader";
import { ProjectCard } from "@/components/ProjectCard";
import { isValidLocale, type Locale } from "@/i18n/config";
import { getDictionary } from "@/i18n/get-dictionary";
import { getProjects } from "@/lib/content";
import { getModule } from "@/lib/modules";

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
      <EditableModuleField
        locale={loc}
        fieldKey="lab:intro"
        defaultText={dict.modules.lab.description}
        editHint={dict.home.noteEdit}
        placeholder={dict.home.pagePlaceholder}
        saveHint={dict.home.pageSaveHint}
        rows={3}
        className="mb-8 max-w-2xl"
      />
      <div className="grid gap-4 sm:grid-cols-2">
        {projects.map((project) => (
          <ProjectCard
            key={project.slug}
            project={project}
            techLabel={dict.projects.tech}
          />
        ))}
      </div>
    </>
  );
}
