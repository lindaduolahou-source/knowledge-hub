"use client";

import { useEffect, useState } from "react";
import type { Locale } from "@/i18n/config";
import type { Dictionary } from "@/i18n/dictionaries/zh";
import type { Project } from "@/lib/content";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import {
  ExtraFieldsEditor,
  ExtraFieldsView,
} from "@/components/ExtraFieldsEditor";
import { RemovableSlot } from "@/components/RemovableSlot";
import { DragHandle, SortableItem, SortableList } from "@/components/SortableReorder";
import {
  createProjectItem,
  loadProjectItems,
  PROJECT_CORE_SLOTS,
  PROJECT_FOCUS_EDIT_EVENT,
  PROJECT_ITEMS_EVENT,
  projectFromContent,
  removeProjectItem,
  reorderProjectItems,
  updateProjectItem,
  type EditableProject,
  type ProjectCoreSlot,
} from "@/lib/project-edits";
import {
  cloneCoreSlots,
  removeCoreSlot,
  restoreCoreSlotOrAddCustom,
} from "@/lib/core-slots";
import { cloneExtraFields, createExtraFieldId } from "@/lib/extra-fields";

interface EditableProjectGridProps {
  locale: Locale;
  dict: Dictionary;
  /** Module scope — lab or a custom module id. */
  moduleId: string;
  projects?: Project[];
  hideAdd?: boolean;
}

function projectLink(project: EditableProject) {
  return project.link || project.github || project.demo;
}

function hrefFor(link: string) {
  return link.startsWith("http://") || link.startsWith("https://")
    ? link
    : `https://${link}`;
}

function draftFromItem(item: EditableProject): EditableProject {
  return {
    ...item,
    link: projectLink(item),
    fields: cloneExtraFields(item.fields),
    coreSlots: cloneCoreSlots(item.coreSlots ?? [...PROJECT_CORE_SLOTS]),
  };
}

export function EditableProjectGrid({
  locale,
  dict,
  moduleId,
  projects = [],
  hideAdd = false,
}: EditableProjectGridProps) {
  const defaults = projects.map(projectFromContent);
  const [items, setItems] = useState<EditableProject[]>(defaults);
  const [ready, setReady] = useState(false);
  const [editingSlug, setEditingSlug] = useState<string | null>(null);
  const [draft, setDraft] = useState<EditableProject | null>(null);
  const [pendingRemoveSlug, setPendingRemoveSlug] = useState<string | null>(
    null,
  );
  const [pendingRemoveFieldId, setPendingRemoveFieldId] = useState<
    string | null
  >(null);
  const [pendingRemoveCoreSlot, setPendingRemoveCoreSlot] =
    useState<ProjectCoreSlot | null>(null);

  useEffect(() => {
    function refresh() {
      setItems(loadProjectItems(moduleId, locale, defaults));
      setReady(true);
    }
    refresh();
    function onUpdate(event: Event) {
      const detail = (event as CustomEvent<{ moduleId?: string }>).detail;
      if (detail?.moduleId && detail.moduleId !== moduleId) return;
      refresh();
    }
    function onFocusEdit(event: Event) {
      const detail = (
        event as CustomEvent<{ moduleId?: string; slug?: string }>
      ).detail;
      if (detail?.moduleId !== moduleId || !detail.slug) return;
      const next = loadProjectItems(moduleId, locale, defaults);
      setItems(next);
      const created = next.find((item) => item.slug === detail.slug);
      if (created) {
        setEditingSlug(created.slug);
        setDraft(draftFromItem(created));
      }
    }
    window.addEventListener(PROJECT_ITEMS_EVENT, onUpdate);
    window.addEventListener(PROJECT_FOCUS_EDIT_EVENT, onFocusEdit);
    window.addEventListener("storage", onUpdate);
    return () => {
      window.removeEventListener(PROJECT_ITEMS_EVENT, onUpdate);
      window.removeEventListener(PROJECT_FOCUS_EDIT_EVENT, onFocusEdit);
      window.removeEventListener("storage", onUpdate);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [locale, moduleId]);

  function startEdit(item: EditableProject) {
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
      updateProjectItem(
        moduleId,
        locale,
        items,
        editingSlug,
        {
          title: draft.title,
          description: draft.description,
          link: draft.link?.trim() || undefined,
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
      removeProjectItem(
        moduleId,
        locale,
        items,
        pendingRemoveSlug,
        defaults,
      ),
    );
    setPendingRemoveSlug(null);
  }

  function handleAdd() {
    const { items: next, slug } = createProjectItem(
      moduleId,
      locale,
      items,
      {
        title: dict.projects.newProjectTitle,
        description: dict.projects.newProjectBody,
      },
      defaults,
    );
    setItems(next);
    const created = next.find((item) => item.slug === slug);
    if (created) startEdit(created);
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
      PROJECT_CORE_SLOTS,
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

  function handleReorder(from: number, to: number) {
    setItems(
      reorderProjectItems(moduleId, locale, items, from, to, defaults),
    );
  }

  if (!ready) {
    return (
      <div className="grid gap-4 sm:grid-cols-2" aria-hidden>
        <div className="h-40 rounded-lg border border-border bg-surface/40" />
        <div className="h-40 rounded-lg border border-border bg-surface/40" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <SortableList count={items.length} onReorder={handleReorder}>
        <div className="grid gap-4 sm:grid-cols-2">
          {items.map((project, index) => {
            const editing = editingSlug === project.slug && draft;
            const link = projectLink(project);
            const core = editing
              ? draft.coreSlots
              : (project.coreSlots ?? [...PROJECT_CORE_SLOTS]);
            return (
              <SortableItem
                key={project.slug}
                index={index}
                className="group/item rounded-lg border border-border bg-surface/50 p-5 transition-colors hover:border-accent/20"
              >
              <div className="mb-3 flex items-start gap-2">
                {!editing && core.includes("title") && (
                  <h3 className="min-w-0 flex-1 text-lg font-medium tracking-tight text-foreground">
                    {project.title || dict.projects.titlePlaceholder}
                  </h3>
                )}
                {(editing || !core.includes("title")) && (
                  <div className="min-w-0 flex-1" />
                )}
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
                      onClick={() => startEdit(project)}
                      title={dict.home.noteEdit}
                      className="cursor-pointer rounded px-1.5 py-0.5 text-[11px] text-transparent transition-colors group-hover/item:text-muted/60 hover:!text-foreground/80 focus-visible:text-foreground/80"
                    >
                      {dict.home.noteEdit}
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => setPendingRemoveSlug(project.slug)}
                    className="cursor-pointer rounded px-1.5 text-sm text-white/35 transition-colors hover:bg-white/10 hover:text-white/75"
                    aria-label={dict.projects.removeProject}
                    title={dict.projects.removeProject}
                  >
                    ×
                  </button>
                </div>
              </div>

              {editing ? (
                <div className="space-y-3">
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
                        placeholder={dict.projects.titlePlaceholder}
                        className="w-full bg-transparent text-lg font-medium text-foreground outline-none placeholder:text-muted/40"
                      />
                    </RemovableSlot>
                  )}
                  {core.includes("description") && (
                    <RemovableSlot
                      removeLabel={dict.common.removeField}
                      onRemove={() => setPendingRemoveCoreSlot("description")}
                    >
                      <textarea
                        value={draft.description}
                        onChange={(event) =>
                          setDraft({
                            ...draft,
                            description: event.target.value,
                          })
                        }
                        rows={3}
                        placeholder={dict.projects.bodyPlaceholder}
                        className="w-full resize-y bg-transparent text-sm leading-relaxed text-muted outline-none placeholder:text-muted/40"
                      />
                    </RemovableSlot>
                  )}
                  {core.includes("link") && (
                    <RemovableSlot
                      removeLabel={dict.common.removeField}
                      onRemove={() => setPendingRemoveCoreSlot("link")}
                    >
                      <input
                        value={draft.link ?? ""}
                        onChange={(event) =>
                          setDraft({
                            ...draft,
                            link: event.target.value.trim() || undefined,
                          })
                        }
                        placeholder={dict.projects.linkPlaceholder}
                        className="w-full bg-transparent font-mono text-xs text-muted outline-none placeholder:text-muted/35"
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
                  {core.includes("description") && (
                    <p className="mb-4 text-sm leading-relaxed text-muted">
                      {project.description || dict.projects.bodyPlaceholder}
                    </p>
                  )}
                  {core.includes("link") && link && (
                    <a
                      href={hrefFor(link)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mb-3 inline-block font-mono text-xs text-accent hover:underline"
                    >
                      {link}
                    </a>
                  )}
                  <ExtraFieldsView fields={project.fields} copy={dict.common} />
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
          {dict.projects.addProject}
        </button>
      )}

      <ConfirmDialog
        open={pendingRemoveSlug !== null}
        message={dict.projects.removeProjectConfirm}
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
