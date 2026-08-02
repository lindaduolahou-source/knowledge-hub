import { BackToExplore } from "@/components/BackToExplore";
import { ModuleShareCardLauncher } from "@/components/ModuleShareCardLauncher";
import type { Locale } from "@/i18n/config";
import type { Dictionary } from "@/i18n/dictionaries/zh";
import type { ModuleConfig } from "@/lib/modules";
import type { ModuleSectionDefault } from "@/lib/module-sections";
import type { ShareCardFieldDef } from "@/lib/share-card";

interface ModulePageChromeProps {
  locale: Locale;
  dict: Dictionary;
  module: ModuleConfig;
  backLabel: string;
  titleDefault: string;
  shareFields: ShareCardFieldDef[];
  /** Same section defaults as EditableModuleSections, so share card stays in sync. */
  sectionDefaults?: ModuleSectionDefault[];
}

export function ModulePageChrome({
  locale,
  dict,
  module,
  backLabel,
  titleDefault,
  shareFields,
  sectionDefaults = [],
}: ModulePageChromeProps) {
  return (
    <>
      <BackToExplore
        locale={locale}
        label={backLabel}
        module={module}
        href={`/${locale}/explore`}
      />
      <ModuleShareCardLauncher
        locale={locale}
        dict={dict}
        moduleId={module.id}
        moduleIcon={module.icon}
        titleDefault={titleDefault}
        baseFields={shareFields}
        sectionDefaults={sectionDefaults}
        floating
      />
    </>
  );
}
