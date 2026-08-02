import { notFound } from "next/navigation";
import { Suspense } from "react";
import { EditableProjectPage } from "@/components/EditableProjectPage";
import { isValidLocale, type Locale } from "@/i18n/config";
import { getDictionary } from "@/i18n/get-dictionary";
import { getProjects } from "@/lib/content";

export const dynamicParams = true;

export default async function LabProjectDetailPage({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}) {
  const { locale, slug } = await params;
  if (!isValidLocale(locale)) notFound();

  const loc = locale as Locale;
  const dict = getDictionary(loc);
  const fileProject = getProjects(loc).find((item) => item.slug === slug);
  const project = fileProject ?? {
    slug,
    title: "",
    description: "",
    date: new Date().toISOString().slice(0, 10),
    tags: [] as string[],
    locale: loc,
  };

  return (
    <Suspense fallback={<div className="h-64 animate-pulse rounded-lg bg-surface/40" />}>
      <EditableProjectPage
        locale={loc}
        dict={dict}
        moduleId="lab"
        backLabel={dict.projects.back}
        project={project}
      />
    </Suspense>
  );
}
