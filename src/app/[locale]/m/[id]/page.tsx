import { notFound } from "next/navigation";
import { ModulePageView } from "@/components/ModulePageView";
import { isValidLocale, type Locale } from "@/i18n/config";
import { getDictionary } from "@/i18n/get-dictionary";
import { isCustomModuleId, resolveModuleConfig } from "@/lib/module-layout";
import { moduleIntroKey } from "@/lib/module-content";

export default async function CustomModulePage({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}) {
  const { locale, id } = await params;
  if (!isValidLocale(locale)) notFound();
  if (!isCustomModuleId(id)) notFound();

  const loc = locale as Locale;
  const dict = getDictionary(loc);
  const mod = resolveModuleConfig(id);

  return (
    <ModulePageView
      locale={loc}
      dict={dict}
      module={mod}
      titleDefault={dict.home.newModuleTitle}
      subtitleDefault={dict.home.customModuleSubtitle}
      introDefault={dict.home.newModuleDescription}
      introFieldKey={moduleIntroKey(id)}
    />
  );
}
