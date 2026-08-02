"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { BackToExplore } from "@/components/BackToExplore";
import { MarkdownContent } from "@/components/MarkdownContent";
import {
  ExtraFieldsEditor,
  ExtraFieldsView,
} from "@/components/ExtraFieldsEditor";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import type { Locale } from "@/i18n/config";
import type { Dictionary } from "@/i18n/dictionaries/zh";
import { cloneExtraFields } from "@/lib/extra-fields";
import { modulePageHref } from "@/lib/post-edits";
import {
  findEditableProject,
  loadProjectItems,
  PROJECT_ITEMS_EVENT,
  projectFromContent,
  updateProjectItem,
  type EditableProject,
} from "@/lib/project-edits";
import type { Project } from "@/lib/content";
import { trashExtraField } from "@/lib/field-trash";
import { removeTrashItem } from "@/lib/trash";

interface EditableProjectPageProps {
  locale: Locale;
  dict: Dictionary;
  moduleId: string;
  backLabel: string;
  project: Project;
}

function draftFrom(item: EditableProject): EditableProject {
  return {
    ...item,
    fields: cloneExtraFields(item.fields),
  };
}

export function EditableProjectPage({
  locale,
  dict,
  moduleId,
  backLabel,
  project,
}: EditableProjectPageProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const fallback = projectFromContent(project);
  const [item, setItem] = useState<EditableProject>(fallback);
  const [ready, setReady] = useState(false);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<EditableProject | null>(null);
  const [pendingRemoveFieldId, setPendingRemoveFieldId] = useState<
    string | null
  >(null);
  const editingRef = useRef(false);
  const sessionFieldTrashIds = useRef<string[]>([]);

  function discardSessionFieldTrash() {
    for (const id of sessionFieldTrashIds.current) removeTrashItem(id);
    sessionFieldTrashIds.current = [];
  }

  function keepSessionFieldTrash() {
    sessionFieldTrashIds.current = [];
  }


  const backHref = modulePageHref(locale, moduleId);

  useEffect(() => {
    editingRef.current = editing;
  }, [editing]);

  useEffect(() => {
    function refresh() {
      // Don't clobber an in-progress edit when peer sync / storage events fire.
      if (editingRef.current) return;
      const next =
        findEditableProject(moduleId, locale, project.slug, fallback) ??
        fallback;
      setItem(next);
      setReady(true);
    }
    refresh();
    function onUpdate(event: Event) {
      const detail = (event as CustomEvent<{ moduleId?: string }>).detail;
      if (detail?.moduleId && detail.moduleId !== moduleId) return;
      refresh();
    }
    window.addEventListener(PROJECT_ITEMS_EVENT, onUpdate);
    window.addEventListener("storage", onUpdate);
    return () => {
      window.removeEventListener(PROJECT_ITEMS_EVENT, onUpdate);
      window.removeEventListener("storage", onUpdate);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [locale, moduleId, project.slug]);

  useEffect(() => {
    if (!ready || editing) return;
    if (searchParams.get("edit") !== "1") return;
    const latest =
      findEditableProject(moduleId, locale, project.slug, fallback) ?? fallback;
    setItem(latest);
    setDraft(draftFrom(latest));
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
      findEditableProject(moduleId, locale, project.slug, item) ?? item;
    setItem(latest);
    setDraft(draftFrom(latest));
    setEditing(true);
  }

  function cancelEdit() {
    discardSessionFieldTrash();
    setDraft(null);
    setEditing(false);
    setPendingRemoveFieldId(null);
    clearEditQuery();
  }

  function commitEdit() {
    if (!draft) return;
    keepSessionFieldTrash();
    const current = loadProjectItems(moduleId, locale, [fallback]);
    const ensured = current.some((row) => row.slug === project.slug)
      ? current
      : [fallback, ...current.filter((row) => row.slug !== project.slug)];
    const next = updateProjectItem(
      moduleId,
      locale,
      ensured,
      project.slug,
      {
        title: draft.title,
        description: draft.description,
        link: draft.link?.trim() || undefined,
        content: draft.content,
        fields: cloneExtraFields(draft.fields),
      },
      [fallback],
    );
    const saved = next.find((row) => row.slug === project.slug) ?? draft;
    setItem(saved);
    setDraft(null);
    setEditing(false);
    clearEditQuery();
  }

  function confirmRemoveField() {
    if (!draft || !pendingRemoveFieldId) return;
    const field = draft.fields.find((row) => row.id === pendingRemoveFieldId);
    if (field) {
      const entry = trashExtraField(
        { scope: "project", moduleId, slug: project.slug },
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

  if (!ready) {
    return <div className="h-64 animate-pulse rounded-lg bg-surface/40" />;
  }

  const hasContent = Boolean(item.content?.trim());

  return (
    <article>
      <BackToExplore locale={locale} label={backLabel} href={backHref} />
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
              {dict.projects.editContent}
            </button>
          )}
        </div>
      </div>

      {editing && draft ? (
        <div className="space-y-4">
          <input
            value={draft.title}
            onChange={(event) =>
              setDraft({ ...draft, title: event.target.value })
            }
            placeholder={dict.projects.titlePlaceholder}
            className="w-full rounded-lg border border-white/20 bg-white/5 px-3 py-2 text-3xl font-medium tracking-tight text-foreground outline-none focus:border-white/40"
          />
          <textarea
            value={draft.description}
            onChange={(event) =>
              setDraft({ ...draft, description: event.target.value })
            }
            rows={2}
            placeholder={dict.projects.bodyPlaceholder}
            className="w-full resize-y rounded-lg border border-white/20 bg-white/5 px-3 py-2 text-sm text-muted outline-none focus:border-white/40"
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
            className="w-full rounded-lg border border-white/20 bg-white/5 px-3 py-2 font-mono text-xs text-muted outline-none focus:border-white/40"
          />
          <div>
            <p className="mb-2 text-xs text-muted">{dict.projects.contentLabel}</p>
            <textarea
              value={draft.content}
              onChange={(event) =>
                setDraft({ ...draft, content: event.target.value })
              }
              rows={16}
              placeholder={dict.projects.contentPlaceholder}
              className="w-full resize-y rounded-lg border border-white/20 bg-white/5 px-3 py-2 text-sm leading-relaxed text-foreground outline-none focus:border-white/40"
            />
          </div>
          <ExtraFieldsEditor
            fields={draft.fields}
            copy={dict.common}
            onChange={(fields) => setDraft({ ...draft, fields })}
            onRequestRemove={setPendingRemoveFieldId}
          />
          <p className="text-[11px] text-muted/70">{dict.home.pageSaveHint}</p>
        </div>
      ) : (
        <>
          <header className="mb-8 border-b border-border pb-8">
            <p className="mb-3 font-mono text-xs text-muted">
              <time dateTime={item.date}>{item.date}</time>
            </p>
            <h1 className="mb-3 text-3xl font-medium tracking-tight">
              {item.title || dict.projects.titlePlaceholder}
            </h1>
            {item.description ? (
              <p className="text-sm leading-relaxed text-muted">
                {item.description}
              </p>
            ) : null}
            {item.link ? (
              <a
                href={
                  item.link.startsWith("http://") ||
                  item.link.startsWith("https://")
                    ? item.link
                    : `https://${item.link}`
                }
                target="_blank"
                rel="noopener noreferrer"
                className="mt-3 inline-block font-mono text-xs text-accent hover:underline"
              >
                {item.link}
              </a>
            ) : null}
          </header>

          {hasContent ? (
            <button
              type="button"
              onClick={startEdit}
              className="w-full cursor-pointer rounded-lg border border-transparent text-left transition-colors hover:border-white/10 hover:bg-white/[0.02]"
              title={dict.projects.editContent}
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
              {dict.projects.emptyContentHint}
            </button>
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
    </article>
  );
}
