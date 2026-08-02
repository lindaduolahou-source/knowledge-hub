import { notFound } from "next/navigation";
import { Suspense } from "react";
import { ArticleShareCard } from "@/components/ArticleShareCard";
import { EditableArticlePage } from "@/components/EditableArticlePage";
import { isValidLocale, locales, type Locale } from "@/i18n/config";
import { getDictionary } from "@/i18n/get-dictionary";
import { getThought, getThoughts } from "@/lib/content";

export function generateStaticParams() {
  return locales.flatMap((locale) =>
    getThoughts(locale).map((t) => ({ locale, slug: t.slug })),
  );
}

export default async function ThoughtPage({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}) {
  const { locale, slug } = await params;
  if (!isValidLocale(locale)) notFound();

  const loc = locale as Locale;
  const dict = getDictionary(loc);
  const filePost = getThought(loc, slug);
  const post =
    filePost ??
    ({
      slug,
      title: "",
      date: new Date().toISOString().slice(0, 10),
      excerpt: "",
      tags: [],
      locale: loc,
      content: "",
    } as const);

  return (
    <>
      <ArticleShareCard
        locale={loc}
        dict={dict}
        moduleId="thoughts"
        slug={post.slug}
        title={post.title || dict.posts.titlePlaceholder}
        excerpt={post.excerpt}
        content={post.content}
        tags={post.tags}
      />
      <Suspense
        fallback={<div className="h-64 animate-pulse rounded-lg bg-surface/40" />}
      >
        <EditableArticlePage
          locale={loc}
          dict={dict}
          collection="thoughts"
          hrefPrefix="thoughts"
          backLabel={dict.thoughts.back}
          post={post}
        />
      </Suspense>
    </>
  );
}
