"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { MarkdownContent } from "@/components/MarkdownContent";
import type { Locale } from "@/i18n/config";
import type { Dictionary } from "@/i18n/dictionaries/zh";
import type { Post } from "@/lib/content";
import {
  findEditablePost,
  POST_CORE_SLOTS,
  POST_ITEMS_EVENT,
  postFromContent,
  updatePostItem,
  loadPostItems,
  type EditablePost,
  type PostCollection,
  type PostCoreSlot,
} from "@/lib/post-edits";
import {
  ExtraFieldsEditor,
  ExtraFieldsView,
} from "@/components/ExtraFieldsEditor";
import { RemovableSlot } from "@/components/RemovableSlot";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import {
  cloneCoreSlots,
  removeCoreSlot,
  restoreCoreSlotOrAddCustom,
} from "@/lib/core-slots";
import { cloneExtraFields, createExtraFieldId } from "@/lib/extra-fields";

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

function draftFromItem(item: EditablePost): EditablePost {
  return {
    ...item,
    tags: [...item.tags],
    fields: cloneExtraFields(item.fields),
    coreSlots: cloneCoreSlots(item.coreSlots ?? [...POST_CORE_SLOTS]),
  };
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
  const [pendingRemoveFieldId, setPendingRemoveFieldId] = useState<
    string | null
  >(null);
  const [pendingRemoveCoreSlot, setPendingRemoveCoreSlot] =
    useState<PostCoreSlot | null>(null);

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
    setDraft(draftFromItem(item));
    setEditing(true);
  }

  function cancelEdit() {
    setDraft(null);
    setEditing(false);
    setPendingRemoveFieldId(null);
    setPendingRemoveCoreSlot(null);
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
        fields: cloneExtraFields(draft.fields),
        coreSlots: cloneCoreSlots(draft.coreSlots),
      },
      [fallback],
    );
    setItem(next.find((row) => row.slug === post.slug) ?? draft);
    setDraft(null);
    setEditing(false);
  }

  function confirmRemoveField() {
    if (!draft || !pendingRemoveFieldId) return;
    setDraft({
      ...draft,
      fields: draft.fields.filter((field) => field.id !== pendingRemoveFieldId),
    });
    setPendingRemoveFieldId(null);
  }

  function confirmRemoveCoreSlot() {
    if (!draft || !pendingRemoveCoreSlot) return;
    setDraft({
      ...draft,
      coreSlots: removeCoreSlot(draft.coreSlots, pendingRemoveCoreSlot),
    });
    setPendingRemoveCoreSlot(null);
  }

  function handleAddField() {
    if (!draft) return;
    const restored = restoreCoreSlotOrAddCustom(
      draft.coreSlots,
      POST_CORE_SLOTS,
      () => {
        setDraft({
          ...draft,
          fields: [
            ...draft.fields,
            {
              id: createExtraFieldId(),
              label: dict.common.newFieldLabel,
              value: dict.common.newFieldValue,
            },
          ],
        });
      },
    );
    if (restored) setDraft({ ...draft, coreSlots: restored });
  }

  if (!ready) {
    return <div className="h-64 animate-pulse rounded-lg bg-surface/40" />;
  }

  const core = editing && draft
    ? draft.coreSlots
    : (item.coreSlots ?? [...POST_CORE_SLOTS]);

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
          {core.includes("date") && (
            <RemovableSlot
              removeLabel={dict.common.removeField}
              onRemove={() => setPendingRemoveCoreSlot("date")}
            >
              <input
                value={draft.date}
                onChange={(event) =>
                  setDraft({ ...draft, date: event.target.value })
                }
                className="w-full bg-transparent font-mono text-xs text-muted outline-none"
              />
            </RemovableSlot>
          )}
          {core.includes("title") && (
            <RemovableSlot
              removeLabel={dict.common.removeField}
              onRemove={() => setPendingRemoveCoreSlot("title")}
            >
              <input
                value={draft.title}
                onChange={(event) =>
                  setDraft({ ...draft, title: event.target.value })
                }
                placeholder={dict.posts.titlePlaceholder}
                className="w-full bg-transparent text-3xl font-medium tracking-tight text-foreground outline-none"
              />
            </RemovableSlot>
          )}
          {core.includes("tags") && (
            <RemovableSlot
              removeLabel={dict.common.removeField}
              onRemove={() => setPendingRemoveCoreSlot("tags")}
            >
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
                className="w-full bg-transparent font-mono text-xs text-accent/80 outline-none"
              />
            </RemovableSlot>
          )}
          {core.includes("excerpt") && (
            <RemovableSlot
              removeLabel={dict.common.removeField}
              onRemove={() => setPendingRemoveCoreSlot("excerpt")}
            >
              <textarea
                value={draft.excerpt}
                onChange={(event) =>
                  setDraft({ ...draft, excerpt: event.target.value })
                }
                rows={2}
                placeholder={dict.posts.excerptPlaceholder}
                className="w-full resize-y bg-transparent text-sm text-muted outline-none"
              />
            </RemovableSlot>
          )}
          {core.includes("content") && (
            <RemovableSlot
              removeLabel={dict.common.removeField}
              onRemove={() => setPendingRemoveCoreSlot("content")}
            >
              <textarea
                value={draft.content}
                onChange={(event) =>
                  setDraft({ ...draft, content: event.target.value })
                }
                rows={16}
                placeholder={dict.posts.bodyPlaceholder}
                className="w-full resize-y bg-transparent text-sm leading-relaxed text-foreground outline-none"
              />
            </RemovableSlot>
          )}
          <ExtraFieldsEditor
            fields={draft.fields}
            copy={dict.common}
            onChange={(fields) => setDraft({ ...draft, fields })}
            onRequestRemove={setPendingRemoveFieldId}
            onAddClick={handleAddField}
          />
          <p className="text-[11px] text-muted/70">{dict.home.pageSaveHint}</p>
        </div>
      ) : (
        <>
          <header className="mb-8 border-b border-border pb-8">
            {(core.includes("date") ||
              (core.includes("tags") && item.tags.length > 0)) && (
              <div className="mb-4 flex flex-wrap items-center gap-3 font-mono text-xs text-muted">
                {core.includes("date") && (
                  <time dateTime={item.date}>{item.date}</time>
                )}
                {core.includes("tags") &&
                  item.tags.map((tag) => (
                    <span
                      key={tag}
                      className="rounded bg-accent/10 px-1.5 py-0.5 text-accent"
                    >
                      {tag}
                    </span>
                  ))}
              </div>
            )}
            {core.includes("title") && (
              <h1 className="text-3xl font-medium tracking-tight">
                {item.title}
              </h1>
            )}
            {core.includes("excerpt") && item.excerpt.trim() && (
              <p className="mt-4 text-sm leading-relaxed text-muted">
                {item.excerpt}
              </p>
            )}
          </header>
          {core.includes("content") && (
            <MarkdownContent content={item.content || item.excerpt} />
          )}
          <ExtraFieldsView fields={item.fields} copy={dict.common} />
        </>
      )}

      <ConfirmDialog
        open={pendingRemoveFieldId !== null}
        message={dict.common.removeFieldConfirm}
        confirmLabel={dict.common.confirm}
        cancelLabel={dict.common.cancel}
        onConfirm={confirmRemoveField}
        onCancel={() => setPendingRemoveFieldId(null)}
      />
      <ConfirmDialog
        open={pendingRemoveCoreSlot !== null}
        message={dict.common.removeFieldConfirm}
        confirmLabel={dict.common.confirm}
        cancelLabel={dict.common.cancel}
        onConfirm={confirmRemoveCoreSlot}
        onCancel={() => setPendingRemoveCoreSlot(null)}
      />
    </article>
  );
}
