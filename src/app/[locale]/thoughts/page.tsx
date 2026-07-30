import { notFound } from "next/navigation";
import { EditableModuleField } from "@/components/EditableModuleField";
import { ModulePageChrome } from "@/components/ModulePageChrome";
import { PageHeader } from "@/components/PageHeader";
import { PostCard } from "@/components/PostCard";
import { isValidLocale, type Locale } from "@/i18n/config";
import { getDictionary } from "@/i18n/get-dictionary";
import { getThoughts } from "@/lib/content";
import { getModule } from "@/lib/modules";

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
      />
      <EditableModuleField
        locale={loc}
        fieldKey="thoughts:intro"
        defaultText={dict.modules.thoughts.description}
        editHint={dict.home.noteEdit}
        placeholder={dict.home.pagePlaceholder}
        saveHint={dict.home.pageSaveHint}
        rows={3}
        className="mb-8 max-w-2xl"
      />
      <div className="grid gap-4">
        {thoughts.map((thought) => (
          <PostCard
            key={thought.slug}
            post={thought}
            locale={locale}
            readMore={dict.blog.readMore}
            hrefPrefix="thoughts"
          />
        ))}
      </div>
    </>
  );
}
