"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { MarkdownContent } from "@/components/MarkdownContent";
import type { Locale } from "@/i18n/config";
import type { Dictionary } from "@/i18n/dictionaries/zh";
import type { Post } from "@/lib/content";
import {
  findEditablePost,
  POST_ITEMS_EVENT,
  postFromContent,
  updatePostItem,
  loadPostItems,
  type EditablePost,
  type PostCollection,
} from "@/lib/post-edits";

interface EditableArticlePageProps {
  locale: Locale;
  dict: Dictionary;
  collection: PostCollection;
  hrefPrefix: string;
  /** Override list/back link (defaults to `/${locale}/${hrefPrefix}`). */
  backHref?: string;
  backLabel: string;
  post: Post;
}

export function EditableArticlePage({
  locale,
  dict,
  collection,
  hrefPrefix,
  backHref,
  backLabel,
  post,
}: EditableArticlePageProps) {
  const fallback = postFromContent(post);
  const [item, setItem] = useState<EditablePost>(fallback);
  const [ready, setReady] = useState(false);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<EditablePost | null>(null);

  useEffect(() => {
    function refresh() {
      const next =
        findEditablePost(collection, locale, post.slug, fallback) ?? fallback;
      setItem(next);
      setReady(true);
    }
    refresh();
    function onUpdate(event: Event) {
      const detail = (
        event as CustomEvent<{ collection?: PostCollection }>
      ).detail;
      if (detail?.collection && detail.collection !== collection) return;
      refresh();
    }
    window.addEventListener(POST_ITEMS_EVENT, onUpdate);
    window.addEventListener("storage", onUpdate);
    return () => {
      window.removeEventListener(POST_ITEMS_EVENT, onUpdate);
      window.removeEventListener("storage", onUpdate);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [locale, collection, post.slug]);

  function startEdit() {
    setDraft({ ...item, tags: [...item.tags] });
    setEditing(true);
  }

  function cancelEdit() {
    setDraft(null);
    setEditing(false);
  }

  function commitEdit() {
    if (!draft) return;
    const current = loadPostItems(collection, locale, [fallback]);
    const ensured = current.some((row) => row.slug === post.slug)
      ? current
      : [fallback, ...current.filter((row) => row.slug !== post.slug)];
    const next = updatePostItem(
      collection,
      locale,
      ensured,
      post.slug,
      {
        title: draft.title,
        excerpt: draft.excerpt,
        tags: draft.tags,
        date: draft.date,
        content: draft.content,
      },
      [fallback],
    );
    setItem(next.find((row) => row.slug === post.slug) ?? draft);
    setDraft(null);
    setEditing(false);
  }

  if (!ready) {
    return <div className="h-64 animate-pulse rounded-lg bg-surface/40" />;
  }

  return (
    <article>
      <div className="mb-8 flex flex-wrap items-center justify-between gap-3">
        <Link
          href={backHref ?? `/${locale}/${hrefPrefix}`}
          className="inline-block font-mono text-xs text-accent hover:underline"
        >
          ← {backLabel}
        </Link>
        <div className="flex items-center gap-1">
          {editing ? (
            <>
              <button
                type="button"
                onClick={commitEdit}
                className="cursor-pointer rounded px-1.5 py-0.5 text-[11px] text-white/55 transition-colors hover:bg-white/10 hover:text-white/85"
              >
                {dict.common.done}
              </button>
              <button
                type="button"
                onClick={cancelEdit}
                className="cursor-pointer rounded px-1.5 py-0.5 text-[11px] text-white/35 transition-colors hover:bg-white/10 hover:text-white/70"
              >
                {dict.common.cancel}
              </button>
            </>
          ) : (
            <button
              type="button"
              onClick={startEdit}
              title={dict.home.noteEdit}
              className="cursor-pointer rounded px-1.5 py-0.5 text-[11px] text-muted/60 transition-colors hover:text-foreground/80"
            >
              {dict.home.noteEdit}
            </button>
          )}
        </div>
      </div>

      {editing && draft ? (
        <div className="space-y-4">
          <input
            value={draft.date}
            onChange={(event) =>
              setDraft({ ...draft, date: event.target.value })
            }
            className="w-full rounded-lg border border-white/20 bg-white/5 px-3 py-2 font-mono text-xs text-muted outline-none focus:border-white/40"
          />
          <input
            value={draft.title}
            onChange={(event) =>
              setDraft({ ...draft, title: event.target.value })
            }
            placeholder={dict.posts.titlePlaceholder}
            className="w-full rounded-lg border border-white/20 bg-white/5 px-3 py-2 text-3xl font-medium tracking-tight text-foreground outline-none focus:border-white/40"
          />
          <input
            value={draft.tags.join(", ")}
            onChange={(event) =>
              setDraft({
                ...draft,
                tags: event.target.value
                  .split(/[,，]/)
                  .map((tag) => tag.trim())
                  .filter(Boolean),
              })
            }
            placeholder={dict.posts.tagsPlaceholder}
            className="w-full rounded-lg border border-white/20 bg-white/5 px-3 py-2 font-mono text-xs text-accent/80 outline-none focus:border-white/40"
          />
          <textarea
            value={draft.excerpt}
            onChange={(event) =>
              setDraft({ ...draft, excerpt: event.target.value })
            }
            rows={2}
            placeholder={dict.posts.excerptPlaceholder}
            className="w-full resize-y rounded-lg border border-white/20 bg-white/5 px-3 py-2 text-sm text-muted outline-none focus:border-white/40"
          />
          <textarea
            value={draft.content}
            onChange={(event) =>
              setDraft({ ...draft, content: event.target.value })
            }
            rows={16}
            placeholder={dict.posts.bodyPlaceholder}
            className="w-full resize-y rounded-lg border border-white/20 bg-white/5 px-3 py-2 text-sm leading-relaxed text-foreground outline-none focus:border-white/40"
          />
          <p className="text-[11px] text-muted/70">{dict.home.pageSaveHint}</p>
        </div>
      ) : (
        <>
          <header className="mb-8 border-b border-border pb-8">
            <div className="mb-4 flex flex-wrap items-center gap-3 font-mono text-xs text-muted">
              <time dateTime={item.date}>{item.date}</time>
              {item.tags.map((tag) => (
                <span
                  key={tag}
                  className="rounded bg-accent/10 px-1.5 py-0.5 text-accent"
                >
                  {tag}
                </span>
              ))}
            </div>
            <h1 className="text-3xl font-medium tracking-tight">{item.title}</h1>
          </header>
          <MarkdownContent content={item.content || item.excerpt} />
        </>
      )}
    </article>
  );
}
