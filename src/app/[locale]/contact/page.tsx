import { notFound } from "next/navigation";
import { ModulePageView } from "@/components/ModulePageView";
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
    <ModulePageView
      locale={loc}
      dict={dict}
      module={mod}
      titleDefault={dict.contact.title}
      subtitleDefault={dict.contact.subtitle}
      introDefault={dict.contact.note}
      introFieldKey="contact:note"
      addFeatures={{ contact: true }}
      extraShareFields={[
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
  );
}
