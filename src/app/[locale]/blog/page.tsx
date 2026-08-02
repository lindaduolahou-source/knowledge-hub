import { notFound } from "next/navigation";
import { ModulePageView } from "@/components/ModulePageView";
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
    <ModulePageView
      locale={loc}
      dict={dict}
      module={mod}
      titleDefault={dict.blog.title}
      subtitleDefault={dict.blog.subtitle}
      introDefault={dict.modules.knowledge.description}
      posts={posts}
      addFeatures={{ postDefaults: posts }}
    />
  );
}
