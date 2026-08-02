import { ModulePageBlocks } from "@/components/ModulePageBlocks";
import type { ModuleAddFeatures } from "@/components/ModuleAddMenu";
import { ModulePageChrome } from "@/components/ModulePageChrome";
import { PageHeader } from "@/components/PageHeader";
import type { Locale } from "@/i18n/config";
import type { Dictionary } from "@/i18n/dictionaries/zh";
import type { PostMeta, Project, RoadmapItem } from "@/lib/content";
import { moduleIntroKey } from "@/lib/module-content";
import type { ModuleConfig } from "@/lib/modules";
import type { ModuleSectionDefault } from "@/lib/module-sections";
import type { ShareCardFieldDef } from "@/lib/share-card";

/** Shared intro textarea height for every module page. */
export const MODULE_INTRO_ROWS = 3;

export type ModulePageViewProps = {
  locale: Locale;
  dict: Dictionary;
  module: ModuleConfig;
  titleDefault: string;
  subtitleDefault: string;
  introDefault: string;
  /** Defaults to `${module.id}:intro`. Contact uses `contact:note` for legacy keys. */
  introFieldKey?: string;
  sectionDefaults?: ModuleSectionDefault[];
  projects?: Project[];
  posts?: PostMeta[];
  roadmapItems?: RoadmapItem[];
  addFeatures?: ModuleAddFeatures;
  /** Extra share-card fields after the standard intro field. */
  extraShareFields?: ShareCardFieldDef[];
};

/**
 * One shell for every explore module (builtin + custom):
 * chrome → header → reorderable blocks → add menu.
 * Pages only differ by seed data and add-menu features.
 */
export function ModulePageView({
  locale,
  dict,
  module,
  titleDefault,
  subtitleDefault,
  introDefault,
  introFieldKey,
  sectionDefaults,
  projects,
  posts,
  roadmapItems,
  addFeatures = {},
  extraShareFields = [],
}: ModulePageViewProps) {
  const fieldKey = introFieldKey ?? moduleIntroKey(module.id);

  return (
    <>
      <ModulePageChrome
        locale={locale}
        dict={dict}
        module={module}
        backLabel={dict.common.backToExplore}
        titleDefault={titleDefault}
        sectionDefaults={sectionDefaults}
        shareFields={[
          {
            id: "intro",
            contentKey: fieldKey,
            label: dict.shareCard.fieldIntro,
            defaultText: introDefault,
          },
          ...extraShareFields,
        ]}
      />
      <PageHeader
        locale={locale}
        moduleId={module.id}
        title={titleDefault}
        subtitle={subtitleDefault}
        module={module}
        editHint={dict.home.noteEdit}
        placeholder={dict.home.titlePlaceholder}
        saveHint={dict.home.noteSaveHint}
        pagePlaceholder={dict.home.pagePlaceholder}
        pageSaveHint={dict.home.pageSaveHint}
      />
      <ModulePageBlocks
        locale={locale}
        dict={dict}
        moduleId={module.id}
        accentColor={module.color}
        intro={{
          fieldKey,
          defaultText: introDefault,
          rows: MODULE_INTRO_ROWS,
        }}
        sectionDefaults={sectionDefaults}
        projects={projects}
        posts={posts}
        roadmapItems={roadmapItems}
        addFeatures={{
          ...addFeatures,
          sectionDefaults: addFeatures.sectionDefaults ?? sectionDefaults,
        }}
      />
    </>
  );
}
