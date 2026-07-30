import { notFound } from "next/navigation";
import { EditableModuleField } from "@/components/EditableModuleField";
import { ModulePageChrome } from "@/components/ModulePageChrome";
import { PageHeader } from "@/components/PageHeader";
import { PostCard } from "@/components/PostCard";
import { isValidLocale, type Locale } from "@/i18n/config";
import { getDictionary } from "@/i18n/get-dictionary";
import { getPosts } from "@/lib/content";
import { getModule } from "@/lib/modules";

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
      />
      <EditableModuleField
        locale={loc}
        fieldKey="knowledge:intro"
        defaultText={dict.modules.knowledge.description}
        editHint={dict.home.noteEdit}
        placeholder={dict.home.pagePlaceholder}
        saveHint={dict.home.pageSaveHint}
        rows={3}
        className="mb-8 max-w-2xl"
      />
      <div className="grid gap-4 sm:grid-cols-2">
        {posts.map((post) => (
          <PostCard
            key={post.slug}
            post={post}
            locale={locale}
            readMore={dict.blog.readMore}
          />
        ))}
      </div>
    </>
  );
}
