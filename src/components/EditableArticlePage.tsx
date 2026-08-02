"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { BackToExplore } from "@/components/BackToExplore";
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
import { trashCoreSlot, trashExtraField } from "@/lib/field-trash";
import { removeTrashItem } from "@/lib/trash";

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
  const router = useRouter();
  const searchParams = useSearchParams();
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
  const editingRef = useRef(false);
  const sessionFieldTrashIds = useRef<string[]>([]);

  function discardSessionFieldTrash() {
    for (const id of sessionFieldTrashIds.current) removeTrashItem(id);
    sessionFieldTrashIds.current = [];
  }

  function keepSessionFieldTrash() {
    sessionFieldTrashIds.current = [];
  }


  useEffect(() => {
    editingRef.current = editing;
  }, [editing]);

  useEffect(() => {
    function refresh() {
      // Don't clobber an in-progress edit when peer sync / storage events fire.
      if (editingRef.current) return;
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

  useEffect(() => {
    if (!ready || editing) return;
    if (searchParams.get("edit") !== "1") return;
    const latest =
      findEditablePost(collection, locale, post.slug, fallback) ?? fallback;
    setItem(latest);
    setDraft(draftFromItem(latest));
    setEditing(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, searchParams]);

  function clearEditQuery() {
    if (searchParams.get("edit") !== "1") return;
    router.replace(window.location.pathname, { scroll: false });
  }

  function startEdit() {
    discardSessionFieldTrash();
    const latest =
      findEditablePost(collection, locale, post.slug, item) ?? item;
    setItem(latest);
    setDraft(draftFromItem(latest));
    setEditing(true);
  }

  function cancelEdit() {
    discardSessionFieldTrash();
    setDraft(null);
    setEditing(false);
    setPendingRemoveFieldId(null);
    setPendingRemoveCoreSlot(null);
    clearEditQuery();
  }

  function commitEdit() {
    if (!draft) return;
    keepSessionFieldTrash();
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
    clearEditQuery();
  }

  function confirmRemoveField() {
    if (!draft || !pendingRemoveFieldId) return;
    const field = draft.fields.find((row) => row.id === pendingRemoveFieldId);
    if (field) {
      const entry = trashExtraField(
        { scope: "post", collection, slug: post.slug },
        field,
      );
      sessionFieldTrashIds.current.push(entry.id);
    }
    setDraft({
      ...draft,
      fields: draft.fields.filter((field) => field.id !== pendingRemoveFieldId),
    });
    setPendingRemoveFieldId(null);
  }

  function confirmRemoveCoreSlot() {
    if (!draft || !pendingRemoveCoreSlot) return;
    const entry = trashCoreSlot(
      { scope: "post", collection, slug: post.slug },
      pendingRemoveCoreSlot,
      pendingRemoveCoreSlot,
    );
    sessionFieldTrashIds.current.push(entry.id);
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

  const core =
    editing && draft
      ? draft.coreSlots
      : (item.coreSlots ?? [...POST_CORE_SLOTS]);
  const hasContent = Boolean(item.content?.trim());
  const showContentSlot = core.includes("content");

  return (
    <article>
      <BackToExplore
        locale={locale}
        label={backLabel}
        href={backHref ?? `/${locale}/${hrefPrefix}`}
      />
      <div className="mb-8 flex flex-wrap items-center justify-end gap-3">
        <div className="flex items-center gap-1">
          {editing ? (
            <>
              <button
                type="button"
                onClick={commitEdit}
                className="cursor-pointer rounded-md border border-white/20 bg-white/10 px-2.5 py-1 text-[11px] text-white/85 transition-colors hover:bg-white/15"
              >
                {dict.common.done}
              </button>
              <button
                type="button"
                onClick={cancelEdit}
                className="cursor-pointer rounded-md px-2.5 py-1 text-[11px] text-white/40 transition-colors hover:bg-white/10 hover:text-white/70"
              >
                {dict.common.cancel}
              </button>
            </>
          ) : (
            <button
              type="button"
              onClick={startEdit}
              className="cursor-pointer rounded-md border border-accent/35 bg-accent/10 px-2.5 py-1 text-[11px] text-accent transition-colors hover:bg-accent/20"
            >
              {dict.posts.editContent}
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
                className="w-full rounded-lg border border-white/20 bg-white/5 px-3 py-2 text-3xl font-medium tracking-tight text-foreground outline-none focus:border-white/40"
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
                className="w-full rounded-lg border border-white/20 bg-white/5 px-3 py-2 font-mono text-xs text-accent/80 outline-none focus:border-white/40"
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
                className="w-full resize-y rounded-lg border border-white/20 bg-white/5 px-3 py-2 text-sm text-muted outline-none focus:border-white/40"
              />
            </RemovableSlot>
          )}
          {core.includes("content") && (
            <RemovableSlot
              removeLabel={dict.common.removeField}
              onRemove={() => setPendingRemoveCoreSlot("content")}
            >
              <div>
                <p className="mb-2 text-xs text-muted">
                  {dict.posts.contentLabel}
                </p>
                <textarea
                  value={draft.content}
                  onChange={(event) =>
                    setDraft({ ...draft, content: event.target.value })
                  }
                  rows={16}
                  placeholder={dict.posts.bodyPlaceholder}
                  className="w-full resize-y rounded-lg border border-white/20 bg-white/5 px-3 py-2 text-sm leading-relaxed text-foreground outline-none focus:border-white/40"
                />
              </div>
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
                {item.title || dict.posts.titlePlaceholder}
              </h1>
            )}
            {core.includes("excerpt") && item.excerpt.trim() && (
              <p className="mt-4 text-sm leading-relaxed text-muted">
                {item.excerpt}
              </p>
            )}
          </header>

          {showContentSlot ? (
            hasContent ? (
              <button
                type="button"
                onClick={startEdit}
                className="w-full cursor-pointer rounded-lg border border-transparent text-left transition-colors hover:border-white/10 hover:bg-white/[0.02]"
                title={dict.posts.editContent}
              >
                <MarkdownContent content={item.content} />
              </button>
            ) : (
              <button
                type="button"
                onClick={startEdit}
                className="w-full cursor-pointer rounded-xl border border-dashed border-white/20 px-4 py-10 text-left text-sm text-white/45 transition-colors hover:border-white/35 hover:text-white/75"
              >
                <span className="mr-2 text-base text-white/50">+</span>
                {dict.posts.emptyContentHint}
              </button>
            )
          ) : null}

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
