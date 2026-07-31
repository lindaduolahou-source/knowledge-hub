import { notFound } from "next/navigation";
import { ArticleShareCard } from "@/components/ArticleShareCard";
import { EditableArticlePage } from "@/components/EditableArticlePage";
import { isValidLocale, type Locale } from "@/i18n/config";
import { getDictionary } from "@/i18n/get-dictionary";
import {
  modulePageHref,
  postHrefPrefixForModule,
} from "@/lib/post-edits";
import { isBuiltinModuleId } from "@/lib/modules";

export const dynamicParams = true;

export default async function ModuleArticlePage({
  params,
}: {
  params: Promise<{ locale: string; collection: string; slug: string }>;
}) {
  const { locale, collection, slug } = await params;
  if (!isValidLocale(locale)) notFound();
  // Legacy blog/thoughts keep their own routes.
  if (collection === "blog" || collection === "thoughts") notFound();

  const loc = locale as Locale;
  const dict = getDictionary(loc);
  const moduleId = collection;
  const hrefPrefix = postHrefPrefixForModule(moduleId);
  const backHref = modulePageHref(loc, moduleId);
  const moduleTitle = isBuiltinModuleId(moduleId)
    ? dict.modules[moduleId].title
    : dict.home.newModuleTitle;
  const post = {
    slug,
    title: "",
    date: new Date().toISOString().slice(0, 10),
    excerpt: "",
    tags: [] as string[],
    locale: loc,
    content: "",
  };

  return (
    <>
      <ArticleShareCard
        locale={loc}
        dict={dict}
        moduleId={moduleId}
        slug={post.slug}
        title={post.title || dict.posts.titlePlaceholder}
        excerpt={post.excerpt}
        content={post.content}
        tags={post.tags}
      />
      <EditableArticlePage
        locale={loc}
        dict={dict}
        collection={collection}
        hrefPrefix={hrefPrefix}
        backHref={backHref}
        backLabel={
          loc === "zh" ? `返回${moduleTitle}` : `Back to ${moduleTitle}`
        }
        post={post}
      />
    </>
  );
}
