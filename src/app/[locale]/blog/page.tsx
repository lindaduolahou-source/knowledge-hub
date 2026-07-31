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
import { getPosts } from "@/lib/content";
import { getModule } from "@/lib/modules";
import {
  postCollectionForModule,
  postHrefPrefixForModule,
} from "@/lib/post-edits";

export default async function BlogPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!isValidLocale(locale)) notFound();

  const loc = locale as Locale;
  const dict = getDictionary(loc);
  const posts = getPosts(loc);
  const mod = getModule("knowledge");

  return (
    <>
      <ModulePageChrome
        locale={loc}
        dict={dict}
        module={mod}
        backLabel={dict.common.backToExplore}
        titleDefault={dict.blog.title}
        shareFields={[
          {
            id: "intro",
            contentKey: "knowledge:intro",
            label: dict.shareCard.fieldIntro,
            defaultText: dict.modules.knowledge.description,
          },
        ]}
      />
      <PageHeader
        locale={loc}
        moduleId="knowledge"
        title={dict.blog.title}
        subtitle={dict.blog.subtitle}
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
          fieldKey="knowledge:intro"
          defaultText={dict.modules.knowledge.description}
          editHint={dict.home.noteEdit}
          placeholder={dict.home.pagePlaceholder}
          saveHint={dict.home.pageSaveHint}
          rows={3}
          className="max-w-2xl"
        />
        <EditableModuleSections
          locale={loc}
          dict={dict}
          moduleId="knowledge"
          accentColor={mod.color}
          defaults={[]}
          hideAdd
        />
        <EditablePostGrid
          locale={loc}
          dict={dict}
          collection={postCollectionForModule("knowledge")}
          posts={posts}
          hrefPrefix={postHrefPrefixForModule("knowledge")}
          readMore={dict.blog.readMore}
          hideAdd
        />
        <EditableProjectGrid
          locale={loc}
          dict={dict}
          moduleId="knowledge"
          hideAdd
        />
        <RoadmapTimeline
          locale={loc}
          moduleId="knowledge"
          dict={dict}
          hideAdd
        />
        <ModuleAddMenu
          locale={loc}
          dict={dict}
          moduleId="knowledge"
          features={{ postDefaults: posts }}
        />
      </div>
    </>
  );
}
