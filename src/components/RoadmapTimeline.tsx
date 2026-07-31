"use client";

import { useEffect, useState } from "react";
import type { Locale } from "@/i18n/config";
import type { Dictionary } from "@/i18n/dictionaries/zh";
import type { RoadmapItem } from "@/lib/content";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import {
  createRoadmapItem,
  loadRoadmapItems,
  removeRoadmapItem,
  ROADMAP_FOCUS_EDIT_EVENT,
  ROADMAP_ITEMS_EVENT,
  updateRoadmapItem,
} from "@/lib/roadmap-edits";

interface RoadmapTimelineProps {
  locale: Locale;
  items: RoadmapItem[];
  dict: Dictionary;
  hideAdd?: boolean;
}

export function RoadmapTimeline({
  locale,
  items: defaults,
  dict,
  hideAdd = false,
}: RoadmapTimelineProps) {
  const [items, setItems] = useState<RoadmapItem[]>(defaults);
  const [ready, setReady] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState<RoadmapItem | null>(null);
  const [pendingRemoveId, setPendingRemoveId] = useState<string | null>(null);

  useEffect(() => {
    function refresh() {
      setItems(loadRoadmapItems(locale, defaults));
      setReady(true);
    }
    refresh();
    function onUpdate() {
      refresh();
    }
    function onFocusEdit(event: Event) {
      const detail = (event as CustomEvent<{ id?: string }>).detail;
      if (!detail?.id) return;
      const next = loadRoadmapItems(locale, defaults);
      setItems(next);
      const created = next.find((item) => item.id === detail.id);
      if (created) {
        setEditingId(created.id);
        setDraft({
          ...created,
          topics: [...created.topics],
        });
      }
    }
    window.addEventListener(ROADMAP_ITEMS_EVENT, onUpdate);
    window.addEventListener(ROADMAP_FOCUS_EDIT_EVENT, onFocusEdit);
    window.addEventListener("storage", onUpdate);
    return () => {
      window.removeEventListener(ROADMAP_ITEMS_EVENT, onUpdate);
      window.removeEventListener(ROADMAP_FOCUS_EDIT_EVENT, onFocusEdit);
      window.removeEventListener("storage", onUpdate);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [locale]);

  function startEdit(item: RoadmapItem) {
    setEditingId(item.id);
    setDraft({ ...item, topics: [...item.topics] });
  }

  function cancelEdit() {
    setEditingId(null);
    setDraft(null);
  }

  function commitEdit() {
    if (!editingId || !draft) return;
    setItems(
      updateRoadmapItem(
        locale,
        items,
        editingId,
        {
          title: draft.title,
          description: draft.description,
          status: draft.status,
          topics: draft.topics,
        },
        defaults,
      ),
    );
    setEditingId(null);
    setDraft(null);
  }

  function confirmRemove() {
    if (!pendingRemoveId) return;
    if (editingId === pendingRemoveId) cancelEdit();
    setItems(removeRoadmapItem(locale, items, pendingRemoveId, defaults));
    setPendingRemoveId(null);
  }

  function handleAdd() {
    const { items: next, id } = createRoadmapItem(
      locale,
      items,
      {
        title: dict.roadmap.newStageTitle,
        description: dict.roadmap.newStageBody,
      },
      defaults,
    );
    setItems(next);
    const created = next.find((item) => item.id === id);
    if (created) startEdit(created);
  }

  if (!ready) {
    return (
      <div className="space-y-4" aria-hidden>
        <div className="h-28 rounded-lg border border-border bg-surface/40" />
        <div className="h-28 rounded-lg border border-border bg-surface/40" />
      </div>
    );
  }

  return (
    <div className="relative space-y-0">
      <div className="absolute left-[11px] top-2 bottom-2 w-px bg-border" />
      {items.map((item, i) => {
        const editing = editingId === item.id && draft;
        return (
          <div
            key={item.id}
            className="group/item relative flex gap-6 pb-10 last:pb-0"
          >
            <div className="relative z-10 mt-1.5 flex h-[22px] w-[22px] shrink-0 items-center justify-center rounded-full border border-border bg-background">
              <div
                className={`h-2 w-2 rounded-full ${
                  item.status === "completed"
                    ? "bg-accent"
                    : item.status === "inProgress"
                      ? "bg-white/50"
                      : "bg-muted/40"
                }`}
              />
            </div>
            <div className="flex-1 rounded-lg border border-border bg-surface/50 p-5 transition-colors hover:border-accent/20">
              <div className="mb-2 flex flex-wrap items-center gap-2">
                <span className="font-mono text-xs text-muted/60">
                  {String(i + 1).padStart(2, "0")}
                </span>
                {!editing && (
                  <span className="rounded border border-white/25 bg-black px-2 py-0.5 font-mono text-xs text-white">
                    {dict.roadmap.status[item.status]}
                  </span>
                )}
                <div className="ml-auto flex items-center gap-1">
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
                      onClick={() => startEdit(item)}
                      title={dict.home.noteEdit}
                      className="cursor-pointer rounded px-1.5 py-0.5 text-[11px] text-transparent transition-colors group-hover/item:text-muted/60 hover:!text-foreground/80 focus-visible:text-foreground/80"
                    >
                      {dict.home.noteEdit}
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => setPendingRemoveId(item.id)}
                    className="cursor-pointer rounded px-1.5 text-sm text-white/35 transition-colors hover:bg-white/10 hover:text-white/75"
                    aria-label={dict.roadmap.removeStage}
                    title={dict.roadmap.removeStage}
                  >
                    ×
                  </button>
                </div>
              </div>

              {editing ? (
                <div className="space-y-3">
                  <select
                    value={draft.status}
                    onChange={(event) =>
                      setDraft({
                        ...draft,
                        status: event.target.value as RoadmapItem["status"],
                      })
                    }
                    className="cursor-pointer rounded border border-white/25 bg-black px-2 py-0.5 font-mono text-xs text-white outline-none [color-scheme:dark]"
                    aria-label={dict.roadmap.statusLabel}
                  >
                    <option value="completed">
                      {dict.roadmap.status.completed}
                    </option>
                    <option value="inProgress">
                      {dict.roadmap.status.inProgress}
                    </option>
                    <option value="planned">
                      {dict.roadmap.status.planned}
                    </option>
                  </select>
                  <input
                    value={draft.title}
                    onChange={(event) =>
                      setDraft({ ...draft, title: event.target.value })
                    }
                    placeholder={dict.roadmap.stageTitlePlaceholder}
                    className="w-full rounded-lg border border-white/20 bg-white/5 px-3 py-2 text-base font-medium text-foreground outline-none placeholder:text-muted/40 focus:border-white/40"
                  />
                  <textarea
                    value={draft.description}
                    onChange={(event) =>
                      setDraft({ ...draft, description: event.target.value })
                    }
                    rows={3}
                    placeholder={dict.roadmap.stageBodyPlaceholder}
                    className="w-full resize-y rounded-lg border border-white/20 bg-white/5 px-3 py-2 text-sm leading-relaxed text-muted outline-none placeholder:text-muted/40 focus:border-white/40"
                  />
                  <input
                    value={draft.topics.join(", ")}
                    onChange={(event) =>
                      setDraft({
                        ...draft,
                        topics: event.target.value
                          .split(/[,，]/)
                          .map((topic) => topic.trim())
                          .filter(Boolean),
                      })
                    }
                    placeholder={dict.roadmap.topicsPlaceholder}
                    className="w-full rounded-lg border border-white/20 bg-white/5 px-3 py-2 font-mono text-xs text-accent/80 outline-none placeholder:text-accent/35 focus:border-white/40"
                  />
                  <p className="text-[11px] text-muted/70">
                    {dict.home.pageSaveHint}
                  </p>
                </div>
              ) : (
                <>
                  <h3 className="mb-2 text-base font-medium text-foreground">
                    {item.title || dict.roadmap.stageTitlePlaceholder}
                  </h3>
                  <p className="mb-3 text-sm leading-relaxed text-muted">
                    {item.description || dict.roadmap.stageBodyPlaceholder}
                  </p>
                  {item.topics.length > 0 && (
                    <div className="flex flex-wrap gap-1.5">
                      {item.topics.map((topic) => (
                        <span
                          key={topic}
                          className="rounded bg-accent/5 px-1.5 py-0.5 font-mono text-xs text-accent/80"
                        >
                          {topic}
                        </span>
                      ))}
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        );
      })}

      {!hideAdd && (
        <div className="relative flex gap-6 pt-2">
          <div className="relative z-10 mt-1.5 h-[22px] w-[22px] shrink-0" />
          <button
            type="button"
            onClick={handleAdd}
            className="w-full cursor-pointer rounded-xl border border-dashed border-white/20 px-4 py-3 text-left text-sm text-white/45 transition-colors hover:border-white/35 hover:text-white/80"
          >
            <span className="mr-2 text-base text-white/50">+</span>
            {dict.roadmap.addStage}
          </button>
        </div>
      )}

      <ConfirmDialog
        open={pendingRemoveId !== null}
        message={dict.roadmap.removeStageConfirm}
        confirmLabel={dict.common.confirm}
        cancelLabel={dict.common.cancel}
        onConfirm={confirmRemove}
        onCancel={() => setPendingRemoveId(null)}
      />
    </div>
  );
}
