import { notFound } from "next/navigation";
import { HubMenu } from "@/components/HubMenu";
import { isValidLocale, type Locale } from "@/i18n/config";
import { getDictionary } from "@/i18n/get-dictionary";

export default async function HubPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!isValidLocale(locale)) notFound();

  const dict = getDictionary(locale as Locale);

  return <HubMenu locale={locale as Locale} dict={dict} />;
}
