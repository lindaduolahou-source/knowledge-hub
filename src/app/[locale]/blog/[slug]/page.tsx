import Link from "next/link";
import { notFound } from "next/navigation";
import { MarkdownContent } from "@/components/MarkdownContent";
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

  const post = getPost(locale as Locale, slug);
  if (!post) notFound();

  const dict = getDictionary(locale as Locale);

  return (
    <article>
      <Link
        href={`/${locale}/blog`}
        className="mb-8 inline-block font-mono text-xs text-accent hover:underline"
      >
        ← {dict.blog.back}
      </Link>
      <header className="mb-8 border-b border-border pb-8">
        <div className="mb-4 flex flex-wrap items-center gap-3 font-mono text-xs text-muted">
          <time dateTime={post.date}>{post.date}</time>
          {post.tags.map((tag) => (
            <span
              key={tag}
              className="rounded bg-accent/10 px-1.5 py-0.5 text-accent"
            >
              {tag}
            </span>
          ))}
        </div>
        <h1 className="text-3xl font-medium tracking-tight">{post.title}</h1>
      </header>
      <MarkdownContent content={post.content} />
    </article>
  );
}
