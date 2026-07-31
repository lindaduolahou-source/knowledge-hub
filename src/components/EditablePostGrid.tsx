"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import type { Locale } from "@/i18n/config";
import type { Dictionary } from "@/i18n/dictionaries/zh";
import type { PostMeta } from "@/lib/content";
import {
  createPostItem,
  loadPostItems,
  POST_CORE_SLOTS,
  POST_FOCUS_EDIT_EVENT,
  POST_ITEMS_EVENT,
  postFromMeta,
  removePostItem,
  reorderPostItems,
  updatePostItem,
  type EditablePost,
  type PostCollection,
  type PostCoreSlot,
} from "@/lib/post-edits";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import {
  ExtraFieldsEditor,
  ExtraFieldsView,
} from "@/components/ExtraFieldsEditor";
import { RemovableSlot } from "@/components/RemovableSlot";
import { DragHandle, SortableItem, SortableList } from "@/components/SortableReorder";
import {
  cloneCoreSlots,
  removeCoreSlot,
  restoreCoreSlotOrAddCustom,
} from "@/lib/core-slots";
import { cloneExtraFields, createExtraFieldId } from "@/lib/extra-fields";

interface EditablePostGridProps {
  locale: Locale;
  dict: Dictionary;
  collection: PostCollection;
  posts: PostMeta[];
  hrefPrefix: string;
  readMore: string;
  hideAdd?: boolean;
}

function draftFromItem(item: EditablePost): EditablePost {
  return {
    ...item,
    tags: [...item.tags],
    fields: cloneExtraFields(item.fields),
    coreSlots: cloneCoreSlots(item.coreSlots ?? [...POST_CORE_SLOTS]),
  };
}

export function EditablePostGrid({
  locale,
  dict,
  collection,
  posts,
  hrefPrefix,
  readMore,
  hideAdd = false,
}: EditablePostGridProps) {
  const defaults = posts.map((post) => postFromMeta(post));
  const [items, setItems] = useState<EditablePost[]>(defaults);
  const [ready, setReady] = useState(false);
  const [editingSlug, setEditingSlug] = useState<string | null>(null);
  const [draft, setDraft] = useState<EditablePost | null>(null);
  const [pendingRemoveSlug, setPendingRemoveSlug] = useState<string | null>(
    null,
  );
  const [pendingRemoveFieldId, setPendingRemoveFieldId] = useState<
    string | null
  >(null);
  const [pendingRemoveCoreSlot, setPendingRemoveCoreSlot] =
    useState<PostCoreSlot | null>(null);

  useEffect(() => {
    function refresh() {
      setItems(loadPostItems(collection, locale, defaults));
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
    function onFocusEdit(event: Event) {
      const detail = (
        event as CustomEvent<{ collection?: PostCollection; slug?: string }>
      ).detail;
      if (detail?.collection !== collection || !detail.slug) return;
      const next = loadPostItems(collection, locale, defaults);
      setItems(next);
      const created = next.find((item) => item.slug === detail.slug);
      if (created) {
        setEditingSlug(created.slug);
        setDraft(draftFromItem(created));
      }
    }
    window.addEventListener(POST_ITEMS_EVENT, onUpdate);
    window.addEventListener(POST_FOCUS_EDIT_EVENT, onFocusEdit);
    window.addEventListener("storage", onUpdate);
    return () => {
      window.removeEventListener(POST_ITEMS_EVENT, onUpdate);
      window.removeEventListener(POST_FOCUS_EDIT_EVENT, onFocusEdit);
      window.removeEventListener("storage", onUpdate);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [locale, collection]);

  function startEdit(item: EditablePost) {
    setEditingSlug(item.slug);
    setDraft(draftFromItem(item));
  }

  function cancelEdit() {
    setEditingSlug(null);
    setDraft(null);
    setPendingRemoveFieldId(null);
    setPendingRemoveCoreSlot(null);
  }

  function commitEdit() {
    if (!editingSlug || !draft) return;
    setItems(
      updatePostItem(
        collection,
        locale,
        items,
        editingSlug,
        {
          title: draft.title,
          excerpt: draft.excerpt,
          tags: draft.tags,
          date: draft.date,
          fields: cloneExtraFields(draft.fields),
          coreSlots: cloneCoreSlots(draft.coreSlots),
        },
        defaults,
      ),
    );
    setEditingSlug(null);
    setDraft(null);
  }

  function confirmRemove() {
    if (!pendingRemoveSlug) return;
    if (editingSlug === pendingRemoveSlug) cancelEdit();
    setItems(
      removePostItem(
        collection,
        locale,
        items,
        pendingRemoveSlug,
        defaults,
      ),
    );
    setPendingRemoveSlug(null);
  }

  function handleAdd() {
    const { items: next, slug } = createPostItem(
      collection,
      locale,
      items,
      {
        title: dict.posts.newPostTitle,
        excerpt: dict.posts.newPostExcerpt,
        content: dict.posts.newPostBody,
      },
      defaults,
    );
    setItems(next);
    const created = next.find((item) => item.slug === slug);
    if (created) startEdit(created);
  }

  function handleReorder(from: number, to: number) {
    setItems(
      reorderPostItems(collection, locale, items, from, to, defaults),
    );
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
    return (
      <div
        className={
          hrefPrefix === "thoughts"
            ? "grid gap-4"
            : "grid gap-4 sm:grid-cols-2"
        }
        aria-hidden
      >
        <div className="h-36 rounded-lg border border-border bg-surface/40" />
        <div className="h-36 rounded-lg border border-border bg-surface/40" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <SortableList count={items.length} onReorder={handleReorder}>
        <div
          className={
            hrefPrefix === "thoughts"
              ? "grid gap-4"
              : "grid gap-4 sm:grid-cols-2"
          }
        >
          {items.map((post, index) => {
            const editing = editingSlug === post.slug && draft;
            const href = `/${locale}/${hrefPrefix}/${post.slug}`;
            const core = editing
              ? draft.coreSlots
              : (post.coreSlots ?? [...POST_CORE_SLOTS]);
            return (
              <SortableItem
                key={post.slug}
                index={index}
                className="group/item rounded-lg border border-border bg-surface/50 p-5 transition-colors hover:border-accent/20"
              >
              <div className="mb-3 flex items-start gap-2">
                <div className="min-w-0 flex-1 font-mono text-xs text-muted">
                  {!editing && core.includes("date") && (
                    <time dateTime={post.date}>{post.date}</time>
                  )}
                </div>
                <div className="flex shrink-0 items-center gap-1">
                  <DragHandle index={index} label={dict.common.reorder} />
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
                      onClick={() => startEdit(post)}
                      title={dict.home.noteEdit}
                      className="cursor-pointer rounded px-1.5 py-0.5 text-[11px] text-transparent transition-colors group-hover/item:text-muted/60 hover:!text-foreground/80 focus-visible:text-foreground/80"
                    >
                      {dict.home.noteEdit}
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => setPendingRemoveSlug(post.slug)}
                    className="cursor-pointer rounded px-1.5 text-sm text-white/35 transition-colors hover:bg-white/10 hover:text-white/75"
                    aria-label={dict.posts.removePost}
                    title={dict.posts.removePost}
                  >
                    ×
                  </button>
                </div>
              </div>

              {editing ? (
                <div className="space-y-3">
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
                        placeholder="YYYY-MM-DD"
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
                        className="w-full bg-transparent text-lg font-medium text-foreground outline-none placeholder:text-muted/40"
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
                        rows={3}
                        placeholder={dict.posts.excerptPlaceholder}
                        className="w-full resize-y bg-transparent text-sm leading-relaxed text-muted outline-none placeholder:text-muted/40"
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
                        className="w-full bg-transparent font-mono text-xs text-accent/80 outline-none placeholder:text-accent/35"
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
                  <p className="text-[11px] text-muted/70">
                    {dict.home.pageSaveHint}
                  </p>
                </div>
              ) : (
                <>
                  {core.includes("tags") && post.tags.length > 0 && (
                    <div className="mb-3 flex flex-wrap gap-1.5">
                      {post.tags.slice(0, 4).map((tag) => (
                        <span
                          key={tag}
                          className="rounded bg-accent/10 px-1.5 py-0.5 font-mono text-xs text-accent"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  )}
                  {core.includes("title") && (
                    <h3 className="mb-2 text-lg font-medium tracking-tight text-foreground">
                      <Link
                        href={href}
                        className="transition-colors hover:text-accent"
                      >
                        {post.title || dict.posts.titlePlaceholder}
                      </Link>
                    </h3>
                  )}
                  {core.includes("excerpt") && (
                    <p className="mb-4 text-sm leading-relaxed text-muted">
                      {post.excerpt || dict.posts.excerptPlaceholder}
                    </p>
                  )}
                  <ExtraFieldsView fields={post.fields} copy={dict.common} />
                  <Link
                    href={href}
                    className="mt-3 inline-block font-mono text-xs text-accent hover:underline"
                  >
                    {readMore} →
                  </Link>
                </>
              )}
              </SortableItem>
            );
          })}
        </div>
      </SortableList>

      {!hideAdd && (
        <button
          type="button"
          onClick={handleAdd}
          className="w-full cursor-pointer rounded-xl border border-dashed border-white/20 px-4 py-3 text-left text-sm text-white/45 transition-colors hover:border-white/35 hover:text-white/80"
        >
          <span className="mr-2 text-base text-white/50">+</span>
          {dict.posts.addPost}
        </button>
      )}

      <ConfirmDialog
        open={pendingRemoveSlug !== null}
        message={dict.posts.removePostConfirm}
        confirmLabel={dict.common.confirm}
        cancelLabel={dict.common.cancel}
        onConfirm={confirmRemove}
        onCancel={() => setPendingRemoveSlug(null)}
      />
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
    </div>
  );
}
