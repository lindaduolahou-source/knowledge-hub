import Link from "next/link";
import { notFound } from "next/navigation";
import { MarkdownContent } from "@/components/MarkdownContent";
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

  const thought = getThought(locale as Locale, slug);
  if (!thought) notFound();

  const dict = getDictionary(locale as Locale);

  return (
    <article>
      <Link
        href={`/${locale}/thoughts`}
        className="mb-8 inline-block font-mono text-xs text-accent hover:underline"
      >
        ← {dict.thoughts.back}
      </Link>
      <header className="mb-8 border-b border-border pb-8">
        <div className="mb-4 flex flex-wrap items-center gap-3 font-mono text-xs text-muted">
          <time dateTime={thought.date}>{thought.date}</time>
          {thought.tags.map((tag) => (
            <span
              key={tag}
              className="rounded bg-accent/10 px-1.5 py-0.5 text-accent"
            >
              {tag}
            </span>
          ))}
        </div>
        <h1 className="text-3xl font-medium tracking-tight">{thought.title}</h1>
      </header>
      <MarkdownContent content={thought.content} />
    </article>
  );
}
