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
import { isCustomModuleId, resolveModuleConfig } from "@/lib/module-layout";
import { moduleIntroKey } from "@/lib/module-content";
import {
  postCollectionForModule,
  postHrefPrefixForModule,
} from "@/lib/post-edits";

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
    <>
      <ModulePageChrome
        locale={loc}
        dict={dict}
        module={mod}
        backLabel={dict.common.backToExplore}
        titleDefault={dict.home.newModuleTitle}
        shareFields={[
          {
            id: "intro",
            contentKey: moduleIntroKey(id),
            label: dict.shareCard.fieldIntro,
            defaultText: dict.home.newModuleDescription,
          },
        ]}
      />
      <PageHeader
        locale={loc}
        moduleId={id}
        title={dict.home.newModuleTitle}
        subtitle={dict.home.customModuleSubtitle}
        module={mod}
        editHint={dict.home.noteEdit}
        placeholder={dict.home.titlePlaceholder}
        saveHint={dict.home.noteSaveHint}
        pagePlaceholder={dict.home.pagePlaceholder}
        pageSaveHint={dict.home.pageSaveHint}
      />
      <div className="space-y-8">
        <EditableModuleField
          locale={loc}
          fieldKey={moduleIntroKey(id)}
          defaultText={dict.home.newModuleDescription}
          editHint={dict.home.noteEdit}
          placeholder={dict.home.pagePlaceholder}
          saveHint={dict.home.pageSaveHint}
          rows={6}
          className="max-w-2xl"
        />
        <EditableModuleSections
          locale={loc}
          dict={dict}
          moduleId={id}
          accentColor={mod.color}
          defaults={[]}
          hideAdd
        />
        <EditableProjectGrid locale={loc} dict={dict} moduleId={id} hideAdd />
        <RoadmapTimeline locale={loc} moduleId={id} dict={dict} hideAdd />
        <EditablePostGrid
          locale={loc}
          dict={dict}
          collection={postCollectionForModule(id)}
          posts={[]}
          hrefPrefix={postHrefPrefixForModule(id)}
          readMore={dict.blog.readMore}
          hideAdd
        />
        <ModuleAddMenu locale={loc} dict={dict} moduleId={id} />
      </div>
    </>
  );
}
