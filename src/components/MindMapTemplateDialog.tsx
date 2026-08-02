"use client";

import { useRef, useState } from "react";
import type { Locale } from "@/i18n/config";
import type { Dictionary } from "@/i18n/dictionaries/zh";
import {
  BUILTIN_MINDMAP_TEMPLATES,
  builtinToMindMapTemplate,
  readMindMapImportFile,
  type MindMapTemplate,
} from "@/lib/mindmap-template";

interface MindMapTemplateDialogProps {
  locale: Locale;
  dict: Dictionary;
  open: boolean;
  onClose: () => void;
  onApply: (template: MindMapTemplate) => void;
}

export function MindMapTemplateDialog({
  locale,
  dict,
  open,
  onClose,
  onApply,
}: MindMapTemplateDialogProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [importing, setImporting] = useState(false);

  if (!open) return null;

  async function handleImport(file: File | null) {
    if (!file) return;
    setImporting(true);
    setError(null);
    try {
      const template = await readMindMapImportFile(file);
      onApply(template);
      onClose();
    } catch {
      setError(dict.mindmap.templateImportError);
    } finally {
      setImporting(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/55 p-4 sm:items-center">
      <button
        type="button"
        className="absolute inset-0 cursor-default"
        aria-label={dict.common.cancel}
        onClick={onClose}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-label={dict.mindmap.fromTemplate}
        className="relative z-10 max-h-[85vh] w-full max-w-lg overflow-auto rounded-xl border border-white/15 bg-[#080b10] p-4 shadow-2xl"
      >
        <div className="mb-3 flex items-start justify-between gap-3">
          <div>
            <h2 className="text-sm font-medium text-white/90">
              {dict.mindmap.templateLibrary}
            </h2>
            <p className="mt-1 text-[11px] text-white/40">
              {dict.mindmap.templateLibraryHint}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="cursor-pointer rounded px-1.5 text-sm text-white/35 transition-colors hover:bg-white/10 hover:text-white/75"
            aria-label={dict.common.cancel}
          >
            ×
          </button>
        </div>

        <div className="mb-4 flex flex-wrap gap-2">
          <button
            type="button"
            disabled={importing}
            onClick={() => inputRef.current?.click()}
            className="cursor-pointer rounded-md border border-white/15 bg-white/5 px-2.5 py-1.5 text-[11px] text-white/75 transition-colors hover:bg-white/10 disabled:opacity-50"
          >
            {dict.mindmap.importTemplate}
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
        </div>
        {error ? (
          <p className="mb-3 text-[11px] text-red-300/90">{error}</p>
        ) : null}

        <p className="mb-2 text-[11px] tracking-wide text-white/35">
          {dict.mindmap.freeTemplates}
        </p>
        <ul className="space-y-2">
          {BUILTIN_MINDMAP_TEMPLATES.map((builtin) => {
            const name =
              locale === "zh" ? builtin.nameZh : builtin.nameEn;
            const description =
              locale === "zh"
                ? builtin.descriptionZh
                : builtin.descriptionEn;
            return (
              <li key={builtin.id}>
                <button
                  type="button"
                  onClick={() => {
                    onApply(builtinToMindMapTemplate(builtin, locale));
                    onClose();
                  }}
                  className="flex w-full cursor-pointer items-start gap-3 rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2.5 text-left transition-colors hover:border-white/25 hover:bg-white/[0.06]"
                >
                  <span className="mt-0.5 text-sm text-white/45">◈</span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm text-white/85">{name}</span>
                    <span className="mt-0.5 block text-[11px] text-white/40">
                      {description}
                    </span>
                  </span>
                  <span className="shrink-0 text-[11px] text-white/45">
                    {dict.mindmap.useTemplate}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}
