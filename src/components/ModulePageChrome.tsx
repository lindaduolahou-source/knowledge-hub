import { BackToExplore } from "@/components/BackToExplore";
import { ShareCardLauncher } from "@/components/ShareCardLauncher";
import type { Locale } from "@/i18n/config";
import type { Dictionary } from "@/i18n/dictionaries/zh";
import type { ModuleConfig } from "@/lib/modules";
import type { ShareCardFieldDef } from "@/lib/share-card";

interface ModulePageChromeProps {
  locale: Locale;
  dict: Dictionary;
  module: ModuleConfig;
  backLabel: string;
  titleDefault: string;
  shareFields: ShareCardFieldDef[];
}

export function ModulePageChrome({
  locale,
  dict,
  module,
  backLabel,
  titleDefault,
  shareFields,
}: ModulePageChromeProps) {
  return (
    <div className="mb-8 flex flex-wrap items-center justify-between gap-3">
      <BackToExplore locale={locale} label={backLabel} module={module} />
      <ShareCardLauncher
        locale={locale}
        dict={dict}
        moduleId={module.id}
        moduleIcon={module.icon}
        titleDefault={titleDefault}
        fields={shareFields}
      />
    </div>
  );
}
