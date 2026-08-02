import { notFound } from "next/navigation";
import { Suspense } from "react";
import { HubCardsPage } from "@/components/HubCardsPage";
import { isValidLocale, type Locale } from "@/i18n/config";
import { getDictionary } from "@/i18n/get-dictionary";

export default async function HubCardsRoute({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!isValidLocale(locale)) notFound();

  const dict = getDictionary(locale as Locale);

  return (
    <Suspense
      fallback={
        <div className="flex min-h-[calc(100dvh-3.5rem)] items-center justify-center text-sm text-white/40">
          …
        </div>
      }
    >
      <HubCardsPage locale={locale as Locale} dict={dict} />
    </Suspense>
  );
}
