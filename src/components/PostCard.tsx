import Link from "next/link";
import type { PostMeta } from "@/lib/content";

interface PostCardProps {
  post: PostMeta;
  locale: string;
  readMore: string;
  hrefPrefix?: string;
}

export function PostCard({
  post,
  locale,
  readMore,
  hrefPrefix = "blog",
}: PostCardProps) {
  const href = `/${locale}/${hrefPrefix}/${post.slug}`;
  return (
    <article className="group rounded-lg border border-border bg-surface/50 p-5 transition-all hover:border-accent/30 hover:bg-surface">
      <div className="mb-3 flex items-center gap-3 font-mono text-xs text-muted">
        <time dateTime={post.date}>{post.date}</time>
        {post.tags.slice(0, 2).map((tag) => (
          <span
            key={tag}
            className="rounded bg-accent/10 px-1.5 py-0.5 text-accent"
          >
            {tag}
          </span>
        ))}
      </div>
      <h3 className="mb-2 text-lg font-medium tracking-tight text-foreground group-hover:text-accent transition-colors">
        <Link href={href}>{post.title}</Link>
      </h3>
      <p className="mb-4 text-sm leading-relaxed text-muted">{post.excerpt}</p>
      <Link
        href={href}
        className="font-mono text-xs text-accent hover:underline"
      >
        {readMore} →
      </Link>
    </article>
  );
}
