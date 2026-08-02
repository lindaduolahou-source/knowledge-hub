"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { BookMarked, FileUp, X } from "lucide-react";
import type { Locale } from "@/i18n/config";
import type { Dictionary } from "@/i18n/dictionaries/zh";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import {
  libraryItemToMindMapTemplate,
  loadMindMapLibrary,
  MINDMAP_LIBRARY_EVENT,
  removeMindMapLibraryTemplate,
  saveMindMapToLibrary,
  type MindMapLibraryTemplate,
} from "@/lib/mindmap-library";
import { readMindMapImportFile, type MindMapTemplate } from "@/lib/mindmap-template";

interface MindMapLibraryDialogProps {
  locale: Locale;
  dict: Dictionary;
  open: boolean;
  onClose: () => void;
  onApply: (template: MindMapTemplate) => void;
}

function formatUpdatedAt(iso: string, locale: Locale) {
  try {
    return new Date(iso).toLocaleString(locale === "zh" ? "zh-CN" : "en-US", {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return iso;
  }
}

function countNodes(root: MindMapTemplate["root"]): number {
  let total = 1;
  for (const child of root.children ?? []) {
    total += countNodes(child);
  }
  return total;
}

export function MindMapLibraryDialog({
  locale,
  dict,
  open,
  onClose,
  onApply,
}: MindMapLibraryDialogProps) {
  const [mounted, setMounted] = useState(false);
  const [items, setItems] = useState<MindMapLibraryTemplate[]>([]);
  const [detailId, setDetailId] = useState<string | null>(null);
  const [pendingRemoveId, setPendingRemoveId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!open) return;
    function refresh() {
      setItems(loadMindMapLibrary());
    }
    refresh();
    window.addEventListener(MINDMAP_LIBRARY_EVENT, refresh);
    window.addEventListener("storage", refresh);
    return () => {
      window.removeEventListener(MINDMAP_LIBRARY_EVENT, refresh);
      window.removeEventListener("storage", refresh);
    };
  }, [open]);

  const detail = detailId
    ? (items.find((item) => item.id === detailId) ?? null)
    : null;

  async function handleImport(file: File | null) {
    if (!file) return;
    setError(null);
    try {
      const template = await readMindMapImportFile(file);
      saveMindMapToLibrary(template);
      setItems(loadMindMapLibrary());
    } catch {
      setError(dict.mindmap.templateImportError);
    } finally {
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  if (!open || !mounted) return null;

  return createPortal(
    <>
      <div
        className="fixed inset-0 z-[100] flex items-end justify-center bg-black/70 p-4 sm:items-center"
        role="dialog"
        aria-modal="true"
        aria-label={dict.mindmap.myLibrary}
        onClick={() => {
          if (detailId) {
            setDetailId(null);
            return;
          }
          onClose();
        }}
      >
        <div
          className="flex max-h-[min(85vh,640px)] w-full max-w-lg flex-col overflow-hidden rounded-2xl border border-white/15 bg-[#080b10] shadow-2xl"
          onClick={(event) => event.stopPropagation()}
        >
          <div className="flex shrink-0 items-center justify-between gap-3 border-b border-white/10 px-5 py-4">
            <div className="min-w-0">
              {detail ? (
                <>
                  <button
                    type="button"
                    onClick={() => setDetailId(null)}
                    className="mb-2 cursor-pointer rounded-full border border-white/20 px-2.5 py-1 text-[11px] text-white/70 transition-colors hover:bg-white/10 hover:text-white"
                  >
                    ← {dict.mindmap.backToLibrary}
                  </button>
                  <p className="truncate text-sm font-medium text-white">
                    {detail.name}
                  </p>
                  <p className="mt-1 text-xs text-white/40">
                    {dict.mindmap.templatePreview}
                  </p>
                </>
              ) : (
                <>
                  <p className="flex items-center gap-2 text-sm font-medium text-white">
                    <BookMarked size={14} strokeWidth={1.75} />
                    {dict.mindmap.myLibrary}
                  </p>
                  <p className="mt-1 text-xs text-white/40">
                    {dict.mindmap.myLibraryHint}
                  </p>
                </>
              )}
            </div>
            <div className="flex shrink-0 items-center gap-1">
              {detail ? (
                <button
                  type="button"
                  onClick={() => setPendingRemoveId(detail.id)}
                  className="cursor-pointer rounded px-1.5 text-sm text-white/35 transition-colors hover:bg-white/10 hover:text-white/75"
                  aria-label={dict.mindmap.removeFromLibrary}
                  title={dict.mindmap.removeFromLibrary}
                >
                  ×
                </button>
              ) : (
                <button
                  type="button"
                  onClick={onClose}
                  className="cursor-pointer rounded-full p-1.5 text-white/45 transition-colors hover:bg-white/10 hover:text-white"
                  aria-label={dict.common.cancel}
                >
                  <X size={16} />
                </button>
              )}
            </div>
          </div>

          <div className="space-y-4 overflow-y-auto p-4">
            {detail ? (
              <>
                <div className="rounded-xl border border-white/10 bg-white/[0.03] px-4 py-4">
                  <p className="text-sm text-white/85">
                    {detail.title || detail.name}
                  </p>
                  <p className="mt-2 text-xs text-white/40">
                    {detail.root.text}
                    <span className="ml-2 text-white/25">
                      · {countNodes(detail.root)} {dict.mindmap.nodesLabel}
                    </span>
                  </p>
                  {detail.description ? (
                    <p className="mt-2 text-xs text-white/35">
                      {detail.description}
                    </p>
                  ) : null}
                  <p className="mt-3 text-[11px] text-white/30">
                    {dict.mindmap.libraryUpdated}{" "}
                    {formatUpdatedAt(detail.updatedAt, locale)}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      onApply(libraryItemToMindMapTemplate(detail));
                      onClose();
                    }}
                    className="inline-flex cursor-pointer items-center justify-center rounded-full border border-white/25 bg-white/10 px-4 py-2 text-xs text-white/90 transition-colors hover:bg-white/15"
                  >
                    {dict.mindmap.useTemplate}
                  </button>
                </div>
              </>
            ) : (
              <>
                <button
                  type="button"
                  onClick={() => inputRef.current?.click()}
                  className="flex w-full cursor-pointer items-center justify-center gap-2 rounded-xl border border-dashed border-white/25 bg-white/[0.03] px-4 py-3.5 text-sm text-white/75 transition-colors hover:border-white/40 hover:bg-white/[0.06]"
                >
                  <FileUp size={16} strokeWidth={1.75} />
                  {dict.mindmap.importToLibrary}
                </button>
                <input
                  ref={inputRef}
                  type="file"
                  accept=".json,.md,.markdown,.txt,application/json,text/markdown,text/plain"
                  className="hidden"
                  onChange={(event) =>
                    void handleImport(event.target.files?.[0] ?? null)
                  }
                />
                {error ? (
                  <p className="text-[11px] text-red-300/90">{error}</p>
                ) : null}

                {items.length === 0 ? (
                  <p className="px-1 py-8 text-center text-xs text-white/35">
                    {dict.mindmap.myLibraryEmpty}
                  </p>
                ) : (
                  <ul className="space-y-2">
                    {items.map((item) => (
                      <li
                        key={item.id}
                        className="relative rounded-xl border border-white/15 bg-white/[0.04]"
                      >
                        <button
                          type="button"
                          onClick={() => setDetailId(item.id)}
                          className="flex w-full cursor-pointer items-start gap-3 px-3 py-3 pr-9 text-left transition-opacity hover:opacity-90"
                        >
                          <span
                            className="mt-0.5 text-base text-white/50"
                            aria-hidden
                          >
                            ◈
                          </span>
                          <span className="min-w-0 flex-1">
                            <span className="block truncate text-sm text-white/90">
                              {item.name}
                            </span>
                            <span className="mt-1 block text-[11px] text-white/35">
                              {dict.mindmap.libraryUpdated}{" "}
                              {formatUpdatedAt(item.updatedAt, locale)}
                            </span>
                          </span>
                          <span className="shrink-0 text-[11px] text-accent">
                            {dict.mindmap.openTemplate} →
                          </span>
                        </button>
                        <button
                          type="button"
                          onClick={(event) => {
                            event.preventDefault();
                            event.stopPropagation();
                            setPendingRemoveId(item.id);
                          }}
                          className="absolute right-1.5 top-1.5 cursor-pointer rounded px-1.5 text-sm text-white/35 transition-colors hover:bg-white/10 hover:text-white/75"
                          aria-label={dict.mindmap.removeFromLibrary}
                          title={dict.mindmap.removeFromLibrary}
                        >
                          ×
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </>
            )}
          </div>
        </div>
      </div>

      <ConfirmDialog
        open={pendingRemoveId !== null}
        message={dict.mindmap.removeFromLibraryConfirm}
        confirmLabel={dict.common.confirm}
        cancelLabel={dict.common.cancel}
        onConfirm={() => {
          if (pendingRemoveId) {
            removeMindMapLibraryTemplate(pendingRemoveId);
            if (detailId === pendingRemoveId) setDetailId(null);
            setItems(loadMindMapLibrary());
          }
          setPendingRemoveId(null);
        }}
        onCancel={() => setPendingRemoveId(null)}
      />
    </>,
    document.body,
  );
}
