import { notFound } from "next/navigation";
import { Suspense } from "react";
import { EditableProjectPage } from "@/components/EditableProjectPage";
import { isValidLocale, type Locale } from "@/i18n/config";
import { getDictionary } from "@/i18n/get-dictionary";
import { isBuiltinModuleId } from "@/lib/modules";

export const dynamicParams = true;

export default async function ModuleProjectDetailPage({
  params,
}: {
  params: Promise<{ locale: string; moduleId: string; slug: string }>;
}) {
  const { locale, moduleId, slug } = await params;
  if (!isValidLocale(locale)) notFound();
  if (moduleId === "lab") notFound();

  const loc = locale as Locale;
  const dict = getDictionary(loc);
  const moduleTitle = isBuiltinModuleId(moduleId)
    ? dict.modules[moduleId].title
    : dict.home.newModuleTitle;
  const project = {
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
        moduleId={moduleId}
        backLabel={
          loc === "zh" ? `返回${moduleTitle}` : `Back to ${moduleTitle}`
        }
        project={project}
      />
    </Suspense>
  );
}
