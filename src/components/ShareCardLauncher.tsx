"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { Share2, X } from "lucide-react";
import type { Locale } from "@/i18n/config";
import type { Dictionary } from "@/i18n/dictionaries/zh";
import {
  ensureCrossLocaleModuleContent,
  moduleTitleKey,
  resolveModuleContent,
} from "@/lib/module-content";
import {
  copyBlobToClipboard,
  downloadBlob,
  renderShareCardPng,
  type ShareCardFieldDef,
} from "@/lib/share-card";

interface ShareCardLauncherProps {
  locale: Locale;
  dict: Dictionary;
  moduleId: string;
  moduleIcon?: string;
  titleDefault: string;
  fields: ShareCardFieldDef[];
}

function readSelection(): string {
  if (typeof window === "undefined") return "";
  const text = window.getSelection()?.toString().trim() ?? "";
  return text.slice(0, 500);
}

function formatFieldText(text: string) {
  return text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .join(" · ");
}

function buildBodyLines(
  fields: ShareCardFieldDef[],
  selected: Record<string, boolean>,
  values: Record<string, string>,
  includeSelection: boolean,
  selectionText: string,
) {
  const lines: string[] = [];
  for (const field of fields) {
    if (!selected[field.id]) continue;
    const text = formatFieldText(values[field.id] ?? "");
    if (text) lines.push(text);
  }
  if (includeSelection && selectionText.trim()) {
    lines.push(selectionText.trim());
  }
  return lines;
}

export function ShareCardLauncher({
  locale,
  dict,
  moduleId,
  moduleIcon = "◇",
  titleDefault,
  fields,
}: ShareCardLauncherProps) {
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [ready, setReady] = useState(false);
  const [title, setTitle] = useState(titleDefault);
  const [values, setValues] = useState<Record<string, string>>({});
  const [selected, setSelected] = useState<Record<string, boolean>>({});
  const [selectionText, setSelectionText] = useState("");
  const [includeSelection, setIncludeSelection] = useState(false);
  const [cardTitle, setCardTitle] = useState("");
  const [cardBody, setCardBody] = useState("");
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState<string | null>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  function applyCardDraft(
    nextTitle: string,
    nextSelected: Record<string, boolean>,
    nextValues: Record<string, string>,
    nextIncludeSelection: boolean,
    nextSelectionText: string,
  ) {
    setCardTitle(nextTitle);
    setCardBody(
      buildBodyLines(
        fields,
        nextSelected,
        nextValues,
        nextIncludeSelection,
        nextSelectionText,
      ).join("\n\n"),
    );
  }

  function loadShareState() {
    const liveTitle = resolveModuleContent(
      locale,
      moduleTitleKey(moduleId),
      titleDefault,
    );
    setTitle(liveTitle);

    const nextValues: Record<string, string> = {};
    const nextSelected: Record<string, boolean> = {};
    for (const field of fields) {
      const text = field.contentKey
        ? resolveModuleContent(locale, field.contentKey, field.defaultText)
        : field.defaultText;
      nextValues[field.id] = text;
      nextSelected[field.id] = Boolean(text.trim());
    }
    if (!Object.values(nextSelected).some(Boolean) && fields[0]) {
      nextSelected[fields[0].id] = true;
    }

    const nextSelectionText = selectionText || readSelection();
    const nextIncludeSelection =
      includeSelection || Boolean(nextSelectionText.trim());

    setValues(nextValues);
    setSelected(nextSelected);
    setSelectionText(nextSelectionText);
    setIncludeSelection(nextIncludeSelection);
    applyCardDraft(
      liveTitle,
      nextSelected,
      nextValues,
      nextIncludeSelection,
      nextSelectionText,
    );
    setReady(true);

    void ensureCrossLocaleModuleContent().then(() => {
      const refreshedTitle = resolveModuleContent(
        locale,
        moduleTitleKey(moduleId),
        titleDefault,
      );
      const refreshedValues: Record<string, string> = {};
      for (const field of fields) {
        refreshedValues[field.id] = field.contentKey
          ? resolveModuleContent(locale, field.contentKey, field.defaultText)
          : field.defaultText;
      }
      setTitle(refreshedTitle);
      setValues(refreshedValues);
    });
  }

  useEffect(() => {
    if (!open) return;
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  const exportLines = cardBody
    .split(/\n+/)
    .map((line) => line.trim())
    .filter(Boolean);
  const canExport = Boolean(cardTitle.trim()) || exportLines.length > 0;

  async function handleDownload() {
    setBusy(true);
    setStatus(null);
    try {
      const blob = await renderShareCardPng({
        brand: "Knowledge Hub",
        moduleId,
        moduleIcon,
        title: cardTitle,
        lines: exportLines,
      });
      downloadBlob(blob, `knowledge-hub-${moduleId}-card.png`);
      setStatus(dict.shareCard.downloaded);
    } catch {
      setStatus(dict.shareCard.failed);
    } finally {
      setBusy(false);
    }
  }

  async function handleCopy() {
    setBusy(true);
    setStatus(null);
    try {
      const blob = await renderShareCardPng({
        brand: "Knowledge Hub",
        moduleId,
        moduleIcon,
        title: cardTitle,
        lines: exportLines,
      });
      const ok = await copyBlobToClipboard(blob);
      setStatus(ok ? dict.shareCard.copied : dict.shareCard.copyFallback);
      if (!ok) downloadBlob(blob, `knowledge-hub-${moduleId}-card.png`);
    } catch {
      setStatus(dict.shareCard.failed);
    } finally {
      setBusy(false);
    }
  }

  const dialog =
    open && mounted
      ? createPortal(
          <div
            className="fixed inset-0 z-[100] flex items-end justify-center bg-black/70 p-4 sm:items-center"
            role="dialog"
            aria-modal="true"
            aria-label={dict.shareCard.title}
            onClick={() => setOpen(false)}
          >
            <div
              className="flex max-h-[min(92vh,760px)] w-full max-w-3xl flex-col overflow-hidden rounded-2xl border border-white/15 bg-[#080b10] shadow-2xl"
              onClick={(event) => event.stopPropagation()}
            >
              <div className="flex shrink-0 items-center justify-between gap-3 border-b border-white/10 px-5 py-4">
                <p className="text-sm font-medium text-white">
                  {dict.shareCard.title}
                </p>
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="cursor-pointer rounded-full p-1.5 text-white/45 transition-colors hover:bg-white/10 hover:text-white"
                  aria-label={dict.shareCard.close}
                >
                  <X size={16} />
                </button>
              </div>

              <div className="grid min-h-0 flex-1 gap-0 overflow-y-auto md:grid-cols-[minmax(0,0.95fr)_minmax(0,1.15fr)]">
                <div className="border-b border-white/10 p-5 md:border-b-0 md:border-r">
                  <p className="mb-3 text-[11px] tracking-[0.16em] text-white/35 uppercase">
                    {dict.shareCard.selectHint}
                  </p>
                  <ul className="space-y-2">
                    {fields.map((field) => {
                      const text = formatFieldText(values[field.id] ?? "");
                      return (
                        <li key={field.id}>
                          <label className="flex cursor-pointer gap-3 rounded-xl border border-white/10 bg-white/[0.03] px-3 py-3 transition-colors hover:border-white/20">
                            <input
                              type="checkbox"
                              checked={Boolean(selected[field.id])}
                              onChange={(event) => {
                                const nextSelected = {
                                  ...selected,
                                  [field.id]: event.target.checked,
                                };
                                setSelected(nextSelected);
                                applyCardDraft(
                                  title,
                                  nextSelected,
                                  values,
                                  includeSelection,
                                  selectionText,
                                );
                              }}
                              className="mt-1 accent-white"
                            />
                            <span className="min-w-0 flex-1">
                              <span className="block text-sm text-white/85">
                                {field.label}
                              </span>
                              <span className="mt-1 line-clamp-2 block text-xs leading-relaxed text-white/40">
                                {ready
                                  ? text || dict.shareCard.emptyField
                                  : "…"}
                              </span>
                            </span>
                          </label>
                        </li>
                      );
                    })}

                    {selectionText.trim() && (
                      <li>
                        <label className="flex cursor-pointer gap-3 rounded-xl border border-dashed border-white/20 bg-white/[0.04] px-3 py-3 transition-colors hover:border-white/35">
                          <input
                            type="checkbox"
                            checked={includeSelection}
                            onChange={(event) => {
                              const nextInclude = event.target.checked;
                              setIncludeSelection(nextInclude);
                              applyCardDraft(
                                title,
                                selected,
                                values,
                                nextInclude,
                                selectionText,
                              );
                            }}
                            className="mt-1 accent-white"
                          />
                          <span className="min-w-0 flex-1">
                            <span className="block text-sm text-white/85">
                              {dict.shareCard.selectionLabel}
                            </span>
                            <span className="mt-1 line-clamp-3 block text-xs leading-relaxed text-white/40">
                              {selectionText}
                            </span>
                          </span>
                        </label>
                      </li>
                    )}
                  </ul>
                  <p className="mt-4 text-[11px] leading-relaxed text-white/30">
                    {dict.shareCard.selectionTip}
                  </p>
                </div>

                <div className="flex flex-col p-5">
                  <div className="mb-3 flex items-baseline justify-between gap-2">
                    <p className="text-[11px] tracking-[0.16em] text-white/35 uppercase">
                      {dict.shareCard.preview}
                    </p>
                    <p className="text-[11px] text-white/30">
                      {dict.shareCard.previewEditHint}
                    </p>
                  </div>

                  <div className="relative overflow-hidden rounded-xl border border-white/20 bg-[#05070a]">
                    <div
                      className="pointer-events-none absolute inset-0 opacity-40"
                      style={{
                        backgroundImage:
                          "linear-gradient(rgba(255,255,255,0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.05) 1px, transparent 1px)",
                        backgroundSize: "28px 28px",
                      }}
                      aria-hidden
                    />
                    <div className="relative space-y-4 p-6 sm:p-8">
                      <p className="text-[11px] tracking-[0.18em] text-white/40">
                        ▸  Knowledge Hub
                      </p>
                      <div className="flex items-start gap-3">
                        <span className="mt-1 text-lg text-white/70" aria-hidden>
                          {moduleIcon}
                        </span>
                        <input
                          value={cardTitle}
                          onChange={(event) => setCardTitle(event.target.value)}
                          placeholder={dict.home.titlePlaceholder}
                          className="min-w-0 flex-1 bg-transparent font-handwrite text-2xl leading-snug text-white outline-none placeholder:text-white/25 sm:text-3xl"
                        />
                      </div>
                      <div className="h-px w-12 bg-white/50" />
                      <textarea
                        value={cardBody}
                        onChange={(event) => setCardBody(event.target.value)}
                        rows={6}
                        placeholder={dict.shareCard.previewEmpty}
                        className="w-full resize-none bg-transparent text-sm leading-relaxed text-white/70 outline-none placeholder:text-white/25 sm:text-[15px]"
                      />
                      <p className="pt-2 text-[11px] text-white/30">
                        {moduleId} · Knowledge Hub
                      </p>
                    </div>
                  </div>

                  <div className="mt-5 flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      disabled={busy || !canExport}
                      onClick={() => void handleDownload()}
                      className="cursor-pointer rounded-full bg-white px-4 py-2 text-xs font-medium text-black transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      {busy ? "…" : dict.shareCard.download}
                    </button>
                    <button
                      type="button"
                      disabled={busy || !canExport}
                      onClick={() => void handleCopy()}
                      className="cursor-pointer rounded-full border border-white/25 px-4 py-2 text-xs text-white/80 transition-colors hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      {dict.shareCard.copy}
                    </button>
                    {status && (
                      <span className="text-xs text-white/45">{status}</span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>,
          document.body,
        )
      : null;

  return (
    <>
      <button
        type="button"
        onMouseDown={() => {
          const sel = readSelection();
          setSelectionText(sel);
          setIncludeSelection(Boolean(sel));
        }}
        onClick={() => {
          setStatus(null);
          loadShareState();
          setOpen(true);
        }}
        className="inline-flex cursor-pointer items-center gap-1.5 rounded-full border border-border px-3 py-1.5 text-xs text-muted transition-colors hover:border-accent/40 hover:bg-surface hover:text-foreground"
        title={dict.shareCard.open}
      >
        <Share2 size={13} strokeWidth={1.75} />
        {dict.shareCard.open}
      </button>
      {dialog}
    </>
  );
}
