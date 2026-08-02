import { notFound } from "next/navigation";
import { Suspense } from "react";
import { ArticleShareCard } from "@/components/ArticleShareCard";
import { EditableArticlePage } from "@/components/EditableArticlePage";
import { isValidLocale, locales, type Locale } from "@/i18n/config";
import { getDictionary } from "@/i18n/get-dictionary";
import { getPost, getPosts } from "@/lib/content";

export function generateStaticParams() {
  return locales.flatMap((locale) =>
    getPosts(locale).map((post) => ({ locale, slug: post.slug })),
  );
}

export default async function BlogPostPage({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}) {
  const { locale, slug } = await params;
  if (!isValidLocale(locale)) notFound();

  const loc = locale as Locale;
  const dict = getDictionary(loc);
  const filePost = getPost(loc, slug);
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
        moduleId="knowledge"
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
          collection="blog"
          hrefPrefix="blog"
          backLabel={dict.blog.back}
          post={post}
        />
      </Suspense>
    </>
  );
}
