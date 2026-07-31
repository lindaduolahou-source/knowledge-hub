import { notFound } from "next/navigation";
import { EditableModuleField } from "@/components/EditableModuleField";
import { EditableModuleSections } from "@/components/EditableModuleSections";
import { EditablePostGrid } from "@/components/EditablePostGrid";
import { EditableProjectGrid } from "@/components/EditableProjectGrid";
import { ModuleAddMenu } from "@/components/ModuleAddMenu";
import { ModulePageChrome } from "@/components/ModulePageChrome";
import { PageHeader } from "@/components/PageHeader";
import { isValidLocale, type Locale } from "@/i18n/config";
import { getDictionary } from "@/i18n/get-dictionary";
import { getThoughts } from "@/lib/content";
import { getModule } from "@/lib/modules";
import {
  postCollectionForModule,
  postHrefPrefixForModule,
} from "@/lib/post-edits";

export default async function ThoughtsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!isValidLocale(locale)) notFound();

  const loc = locale as Locale;
  const dict = getDictionary(loc);
  const thoughts = getThoughts(loc);
  const mod = getModule("thoughts");

  return (
    <>
      <ModulePageChrome
        locale={loc}
        dict={dict}
        module={mod}
        backLabel={dict.common.backToExplore}
        titleDefault={dict.thoughts.title}
        shareFields={[
          {
            id: "intro",
            contentKey: "thoughts:intro",
            label: dict.shareCard.fieldIntro,
            defaultText: dict.modules.thoughts.description,
          },
        ]}
      />
      <PageHeader
        locale={loc}
        moduleId="thoughts"
        title={dict.thoughts.title}
        subtitle={dict.thoughts.subtitle}
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
          fieldKey="thoughts:intro"
          defaultText={dict.modules.thoughts.description}
          editHint={dict.home.noteEdit}
          placeholder={dict.home.pagePlaceholder}
          saveHint={dict.home.pageSaveHint}
          rows={3}
          className="max-w-2xl"
        />
        <EditableModuleSections
          locale={loc}
          dict={dict}
          moduleId="thoughts"
          accentColor={mod.color}
          defaults={[]}
          hideAdd
        />
        <EditablePostGrid
          locale={loc}
          dict={dict}
          collection={postCollectionForModule("thoughts")}
          posts={thoughts}
          hrefPrefix={postHrefPrefixForModule("thoughts")}
          readMore={dict.blog.readMore}
          hideAdd
        />
        <EditableProjectGrid
          locale={loc}
          dict={dict}
          moduleId="thoughts"
          hideAdd
        />
        <ModuleAddMenu
          locale={loc}
          dict={dict}
          moduleId="thoughts"
          features={{ postDefaults: thoughts }}
        />
      </div>
    </>
  );
}
