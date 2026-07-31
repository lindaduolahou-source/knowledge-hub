"use client";

import { useEffect, useState } from "react";
import type { Locale } from "@/i18n/config";
import type { Dictionary } from "@/i18n/dictionaries/zh";
import type { Project } from "@/lib/content";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import {
  createProjectItem,
  loadProjectItems,
  PROJECT_FOCUS_EDIT_EVENT,
  PROJECT_ITEMS_EVENT,
  projectFromContent,
  removeProjectItem,
  updateProjectItem,
  type EditableProject,
  type ProjectExtraField,
} from "@/lib/project-edits";

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
        setDraft({
          ...created,
          link: projectLink(created),
          fields: created.fields.map((field) => ({ ...field })),
        });
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
    setDraft({
      ...item,
      link: projectLink(item),
      fields: item.fields.map((field) => ({ ...field })),
    });
  }

  function cancelEdit() {
    setEditingSlug(null);
    setDraft(null);
    setPendingRemoveFieldId(null);
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
          fields: draft.fields.map((field) => ({ ...field })),
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

  function addField() {
    if (!draft) return;
    const field: ProjectExtraField = {
      id: `field-${Date.now().toString(36)}`,
      label: dict.projects.newFieldLabel,
      value: dict.projects.newFieldValue,
    };
    setDraft({ ...draft, fields: [...draft.fields, field] });
  }

  function patchField(
    fieldId: string,
    patch: Partial<Pick<ProjectExtraField, "label" | "value">>,
  ) {
    if (!draft) return;
    setDraft({
      ...draft,
      fields: draft.fields.map((field) =>
        field.id === fieldId ? { ...field, ...patch } : field,
      ),
    });
  }

  function confirmRemoveField() {
    if (!draft || !pendingRemoveFieldId) return;
    setDraft({
      ...draft,
      fields: draft.fields.filter((field) => field.id !== pendingRemoveFieldId),
    });
    setPendingRemoveFieldId(null);
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
      <div className="grid gap-4 sm:grid-cols-2">
        {items.map((project) => {
          const editing = editingSlug === project.slug && draft;
          const link = projectLink(project);
          return (
            <article
              key={project.slug}
              className="group/item rounded-lg border border-border bg-surface/50 p-5 transition-colors hover:border-accent/20"
            >
              <div className="mb-3 flex items-start gap-2">
                {!editing && (
                  <h3 className="min-w-0 flex-1 text-lg font-medium tracking-tight text-foreground">
                    {project.title || dict.projects.titlePlaceholder}
                  </h3>
                )}
                {editing && <div className="min-w-0 flex-1" />}
                <div className="flex shrink-0 items-center gap-1">
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
                  <input
                    value={draft.title}
                    onChange={(event) =>
                      setDraft({ ...draft, title: event.target.value })
                    }
                    placeholder={dict.projects.titlePlaceholder}
                    className="w-full rounded-lg border border-white/20 bg-white/5 px-3 py-2 text-lg font-medium text-foreground outline-none placeholder:text-muted/40 focus:border-white/40"
                  />
                  <textarea
                    value={draft.description}
                    onChange={(event) =>
                      setDraft({ ...draft, description: event.target.value })
                    }
                    rows={3}
                    placeholder={dict.projects.bodyPlaceholder}
                    className="w-full resize-y rounded-lg border border-white/20 bg-white/5 px-3 py-2 text-sm leading-relaxed text-muted outline-none placeholder:text-muted/40 focus:border-white/40"
                  />
                  <input
                    value={draft.link ?? ""}
                    onChange={(event) =>
                      setDraft({
                        ...draft,
                        link: event.target.value.trim() || undefined,
                      })
                    }
                    placeholder={dict.projects.linkPlaceholder}
                    className="w-full rounded-lg border border-white/20 bg-white/5 px-3 py-2 font-mono text-xs text-muted outline-none placeholder:text-muted/35 focus:border-white/40"
                  />

                  <div className="space-y-2 border-t border-white/10 pt-3">
                    {draft.fields.map((field) => (
                      <div
                        key={field.id}
                        className="rounded-lg border border-white/10 bg-white/[0.03] p-3"
                      >
                        <div className="mb-2 flex items-center gap-2">
                          <input
                            value={field.label}
                            onChange={(event) =>
                              patchField(field.id, {
                                label: event.target.value,
                              })
                            }
                            placeholder={dict.projects.fieldLabelPlaceholder}
                            className="min-w-0 flex-1 bg-transparent text-xs text-muted outline-none placeholder:text-muted/40"
                          />
                          <button
                            type="button"
                            onClick={() => setPendingRemoveFieldId(field.id)}
                            className="cursor-pointer rounded px-1.5 text-sm text-white/35 transition-colors hover:bg-white/10 hover:text-white/75"
                            aria-label={dict.projects.removeField}
                            title={dict.projects.removeField}
                          >
                            ×
                          </button>
                        </div>
                        <textarea
                          value={field.value}
                          onChange={(event) =>
                            patchField(field.id, {
                              value: event.target.value,
                            })
                          }
                          rows={2}
                          placeholder={dict.projects.fieldValuePlaceholder}
                          className="w-full resize-y bg-transparent text-sm text-foreground outline-none placeholder:text-muted/40"
                        />
                      </div>
                    ))}
                    <button
                      type="button"
                      onClick={addField}
                      className="w-full cursor-pointer rounded-lg border border-dashed border-white/20 px-3 py-2 text-left text-xs text-white/45 transition-colors hover:border-white/35 hover:text-white/80"
                    >
                      <span className="mr-1.5 text-sm text-white/50">+</span>
                      {dict.projects.addField}
                    </button>
                  </div>

                  <p className="text-[11px] text-muted/70">
                    {dict.home.pageSaveHint}
                  </p>
                </div>
              ) : (
                <>
                  <p className="mb-4 text-sm leading-relaxed text-muted">
                    {project.description || dict.projects.bodyPlaceholder}
                  </p>
                  {link && (
                    <a
                      href={hrefFor(link)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mb-3 inline-block font-mono text-xs text-accent hover:underline"
                    >
                      {link}
                    </a>
                  )}
                  {project.fields.length > 0 && (
                    <div className="mt-3 space-y-2 border-t border-white/10 pt-3">
                      {project.fields.map((field) => (
                        <div key={field.id}>
                          <p className="mb-0.5 text-xs text-muted">
                            {field.label || dict.projects.fieldLabelPlaceholder}
                          </p>
                          <p className="whitespace-pre-wrap text-sm text-foreground/85">
                            {field.value || dict.projects.fieldValuePlaceholder}
                          </p>
                        </div>
                      ))}
                    </div>
                  )}
                </>
              )}
            </article>
          );
        })}
      </div>

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
        message={dict.projects.removeFieldConfirm}
        confirmLabel={dict.common.confirm}
        cancelLabel={dict.common.cancel}
        onConfirm={confirmRemoveField}
        onCancel={() => setPendingRemoveFieldId(null)}
      />
    </div>
  );
}
