import { notFound } from "next/navigation";
import { HubMorePage } from "@/components/HubMorePage";
import { isValidLocale, type Locale } from "@/i18n/config";
import { getDictionary } from "@/i18n/get-dictionary";

export default async function HubMoreRoute({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!isValidLocale(locale)) notFound();

  const dict = getDictionary(locale as Locale);

  return <HubMorePage locale={locale as Locale} dict={dict} />;
}
