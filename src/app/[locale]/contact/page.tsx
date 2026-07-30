import { notFound } from "next/navigation";
import { ContactEditableBody } from "@/components/ContactEditableBody";
import { ModulePageChrome } from "@/components/ModulePageChrome";
import { PageHeader } from "@/components/PageHeader";
import { isValidLocale, type Locale } from "@/i18n/config";
import { getDictionary } from "@/i18n/get-dictionary";
import { getModule } from "@/lib/modules";

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
      <ContactEditableBody locale={loc} dict={dict} />
    </>
  );
}
