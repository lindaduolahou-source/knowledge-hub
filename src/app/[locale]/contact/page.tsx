import { notFound } from "next/navigation";
import { ContactEditableBody } from "@/components/ContactEditableBody";
import { EditableModuleSections } from "@/components/EditableModuleSections";
import { EditablePostGrid } from "@/components/EditablePostGrid";
import { EditableProjectGrid } from "@/components/EditableProjectGrid";
import { ModuleAddMenu } from "@/components/ModuleAddMenu";
import { ModulePageChrome } from "@/components/ModulePageChrome";
import { PageHeader } from "@/components/PageHeader";
import { RoadmapTimeline } from "@/components/RoadmapTimeline";
import { isValidLocale, type Locale } from "@/i18n/config";
import { getDictionary } from "@/i18n/get-dictionary";
import { getModule } from "@/lib/modules";
import {
  postCollectionForModule,
  postHrefPrefixForModule,
} from "@/lib/post-edits";

export default async function ContactPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!isValidLocale(locale)) notFound();

  const loc = locale as Locale;
  const dict = getDictionary(loc);
  const mod = getModule("contact");

  return (
    <>
      <ModulePageChrome
        locale={loc}
        dict={dict}
        module={mod}
        backLabel={dict.common.backToExplore}
        titleDefault={dict.contact.title}
        shareFields={[
          {
            id: "note",
            contentKey: "contact:note",
            label: dict.shareCard.fieldIntro,
            defaultText: dict.contact.note,
          },
          {
            id: "email",
            contentKey: "contact:email",
            label: dict.contact.email,
            defaultText: "hello@example.com",
          },
          {
            id: "github",
            contentKey: "contact:github",
            label: dict.contact.github,
            defaultText: "github.com/yourname",
          },
        ]}
      />
      <PageHeader
        locale={loc}
        moduleId="contact"
        title={dict.contact.title}
        subtitle={dict.contact.subtitle}
        module={mod}
        editHint={dict.home.noteEdit}
        placeholder={dict.home.titlePlaceholder}
        saveHint={dict.home.noteSaveHint}
      />
      <div className="space-y-8">
        <ContactEditableBody locale={loc} dict={dict} hideAdd />
        <EditableModuleSections
          locale={loc}
          dict={dict}
          moduleId="contact"
          accentColor={mod.color}
          defaults={[]}
          hideAdd
        />
        <EditableProjectGrid
          locale={loc}
          dict={dict}
          moduleId="contact"
          hideAdd
        />
        <EditablePostGrid
          locale={loc}
          dict={dict}
          collection={postCollectionForModule("contact")}
          posts={[]}
          hrefPrefix={postHrefPrefixForModule("contact")}
          readMore={dict.blog.readMore}
          hideAdd
        />
        <RoadmapTimeline
          locale={loc}
          moduleId="contact"
          dict={dict}
          hideAdd
        />
        <ModuleAddMenu
          locale={loc}
          dict={dict}
          moduleId="contact"
          features={{ contact: true }}
        />
      </div>
    </>
  );
}
