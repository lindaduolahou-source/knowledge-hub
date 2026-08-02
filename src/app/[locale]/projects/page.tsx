import { notFound } from "next/navigation";
import { ModulePageView } from "@/components/ModulePageView";
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
    <ModulePageView
      locale={loc}
      dict={dict}
      module={mod}
      titleDefault={dict.projects.title}
      subtitleDefault={dict.projects.subtitle}
      introDefault={dict.modules.lab.description}
      projects={projects}
      addFeatures={{ projectDefaults: projects }}
    />
  );
}
