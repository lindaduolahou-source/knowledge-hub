"use client";

import { useEffect, useMemo, useRef, useState, type PointerEvent as ReactPointerEvent } from "react";
import { createPortal } from "react-dom";
import { ImagePlus, Share2, Sparkles, X } from "lucide-react";
import type { Locale } from "@/i18n/config";
import type { Dictionary } from "@/i18n/dictionaries/zh";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import {
  ensureCrossLocaleModuleContent,
  moduleTitleKey,
  resolveModuleContent,
} from "@/lib/module-content";
import {
  copyBlobToClipboard,
  DEFAULT_SHARE_CARD_TYPOGRAPHY,
  downloadBlob,
  ensureShareCardFontLoaded,
  normalizeShareCardTypography,
  readImageFileAsDataUrl,
  renderShareCardPng,
  resolveShareCardFontStack,
  SHARE_CARD_FONT_OPTIONS,
  shareCardFontLabel,
  type ShareCardFieldDef,
  type ShareCardFontId,
  type ShareCardSticker,
  type ShareCardTypography,
} from "@/lib/share-card";
import {
  loadShareCardDraft,
  saveShareCardDraft,
  serializeShareCardDraft,
  type ShareCardDraft,
} from "@/lib/share-card-draft";

interface ShareCardLauncherProps {
  locale: Locale;
  dict: Dictionary;
  moduleId: string;
  moduleIcon?: string;
  titleDefault: string;
  fields: ShareCardFieldDef[];
  /** Match cosmic header styling on home/explore. */
  immersive?: boolean;
  /** Pin the open button to the viewport (module pages). */
  floating?: boolean;
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

function clamp(n: number, min: number, max: number) {
  return Math.min(max, Math.max(min, n));
}

function normalizeRotationDisplay(deg: number) {
  return Math.round(((((deg ?? 0) % 360) + 540) % 360) - 180);
}

export function ShareCardLauncher({
  locale,
  dict,
  moduleId,
  moduleIcon = "◇",
  titleDefault,
  fields,
  immersive = false,
  floating = false,
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
  const [backgroundUrl, setBackgroundUrl] = useState<string | null>(null);
  const [stickers, setStickers] = useState<ShareCardSticker[]>([]);
  const [typography, setTypography] = useState<ShareCardTypography>(
    DEFAULT_SHARE_CARD_TYPOGRAPHY,
  );
  const [selectedStickerId, setSelectedStickerId] = useState<string | null>(
    null,
  );
  const [savedBaseline, setSavedBaseline] = useState("");
  const [exitPromptOpen, setExitPromptOpen] = useState(false);
  const [interact, setInteract] = useState<null | {
    id: string;
    mode: "move" | "scale" | "rotate";
    offsetX: number;
    offsetY: number;
    centerX: number;
    centerY: number;
    startSize: number;
    startDist: number;
    startAngle: number;
    startRotation: number;
  }>(null);

  const previewRef = useRef<HTMLDivElement>(null);
  const stickersRef = useRef(stickers);
  const interactRef = useRef(interact);
  const bgInputRef = useRef<HTMLInputElement>(null);
  const stickerInputRef = useRef<HTMLInputElement>(null);
  stickersRef.current = stickers;
  interactRef.current = interact;

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

    const pageSelection = readSelection();
    let nextSelectionText = pageSelection || selectionText;
    let nextIncludeSelection =
      Boolean(pageSelection.trim()) || includeSelection;
    let nextCardTitle = liveTitle;
    let nextCardBody = buildBodyLines(
      fields,
      nextSelected,
      nextValues,
      nextIncludeSelection,
      nextSelectionText,
    ).join("\n\n");
    let nextBackground: string | null = null;
    let nextStickers: ShareCardSticker[] = [];
    let nextTypography = DEFAULT_SHARE_CARD_TYPOGRAPHY;

    const draft = loadShareCardDraft(moduleId);
    if (draft) {
      nextCardTitle = draft.cardTitle;
      nextCardBody = draft.cardBody;
      nextBackground = draft.backgroundUrl;
      nextStickers = draft.stickers;
      nextTypography = normalizeShareCardTypography(draft.typography);
      if (Object.keys(draft.selected).length > 0) {
        for (const field of fields) {
          if (Object.prototype.hasOwnProperty.call(draft.selected, field.id)) {
            nextSelected[field.id] = Boolean(draft.selected[field.id]);
          }
        }
      }
      nextIncludeSelection = draft.includeSelection;
      if (draft.selectionText.trim()) {
        nextSelectionText = draft.selectionText;
      }
    }

    setValues(nextValues);
    setSelected(nextSelected);
    setSelectionText(nextSelectionText);
    setIncludeSelection(nextIncludeSelection);
    setCardTitle(nextCardTitle);
    setCardBody(nextCardBody);
    setBackgroundUrl(nextBackground);
    setStickers(nextStickers);
    setTypography(nextTypography);
    setSelectedStickerId(null);
    setExitPromptOpen(false);

    const baselineDraft: ShareCardDraft = {
      cardTitle: nextCardTitle,
      cardBody: nextCardBody,
      backgroundUrl: nextBackground,
      stickers: nextStickers,
      selected: nextSelected,
      includeSelection: nextIncludeSelection,
      selectionText: nextSelectionText,
      typography: nextTypography,
    };
    setSavedBaseline(serializeShareCardDraft(baselineDraft));
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

  function openFromHeaderPicker() {
    setStatus(null);
    loadShareState();
    setOpen(true);
  }

  useEffect(() => {
    if (!mounted) return;

    function onOpenEvent() {
      openFromHeaderPicker();
    }

    window.addEventListener("knowledge-hub:open-share-card", onOpenEvent);

    try {
      const url = new URL(window.location.href);
      if (url.searchParams.get("shareCard") === "1") {
        openFromHeaderPicker();
        url.searchParams.delete("shareCard");
        const qs = url.searchParams.toString();
        window.history.replaceState(
          null,
          "",
          `${url.pathname}${qs ? `?${qs}` : ""}${url.hash}`,
        );
      }
    } catch {
      // ignore malformed URL
    }

    return () => {
      window.removeEventListener("knowledge-hub:open-share-card", onOpenEvent);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mounted, moduleId]);

  const currentDraft = useMemo<ShareCardDraft>(
    () => ({
      cardTitle,
      cardBody,
      backgroundUrl,
      stickers,
      selected,
      includeSelection,
      selectionText,
      typography,
    }),
    [
      cardTitle,
      cardBody,
      backgroundUrl,
      stickers,
      selected,
      includeSelection,
      selectionText,
      typography,
    ],
  );

  const dirty =
    open &&
    ready &&
    Boolean(savedBaseline) &&
    serializeShareCardDraft(currentDraft) !== savedBaseline;
  const dirtyRef = useRef(dirty);
  dirtyRef.current = dirty;

  function persistDraft(draft: ShareCardDraft = currentDraft) {
    saveShareCardDraft(moduleId, draft);
    setSavedBaseline(serializeShareCardDraft(draft));
  }

  function handleSaveChanges() {
    persistDraft();
    setStatus(dict.shareCard.saved);
  }

  function closeDialog() {
    setExitPromptOpen(false);
    setOpen(false);
    setSelectedStickerId(null);
    setStatus(null);
  }

  function requestClose() {
    if (dirtyRef.current) {
      setExitPromptOpen(true);
      return;
    }
    closeDialog();
  }

  function confirmSaveAndExit() {
    persistDraft();
    closeDialog();
  }

  function discardAndExit() {
    closeDialog();
  }

  useEffect(() => {
    if (!open) return;
    function onKey(event: KeyboardEvent) {
      if (event.key !== "Escape") return;
      if (exitPromptOpen) return;
      requestClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, exitPromptOpen]);

  useEffect(() => {
    if (!interact) return;

    function onMove(event: PointerEvent) {
      const current = interactRef.current;
      const box = previewRef.current?.getBoundingClientRect();
      if (!current || !box || box.width <= 0 || box.height <= 0) return;

      const px = (event.clientX - box.left) / box.width;
      const py = (event.clientY - box.top) / box.height;

      if (current.mode === "move") {
        setStickers((prev) =>
          prev.map((item) =>
            item.id === current.id
              ? {
                  ...item,
                  x: clamp(px - current.offsetX, 0.04, 0.96),
                  y: clamp(py - current.offsetY, 0.04, 0.96),
                }
              : item,
          ),
        );
        return;
      }

      if (current.mode === "scale") {
        const dist = Math.hypot(px - current.centerX, py - current.centerY);
        const ratio =
          current.startDist > 0.001 ? dist / current.startDist : 1;
        const nextSize = clamp(current.startSize * ratio, 0.06, 0.55);
        setStickers((prev) =>
          prev.map((item) =>
            item.id === current.id ? { ...item, size: nextSize } : item,
          ),
        );
        return;
      }

      // Free rotation (any angle, continuous degrees — not 90° steps).
      const angle =
        (Math.atan2(py - current.centerY, px - current.centerX) * 180) /
        Math.PI;
      const nextRotation = current.startRotation + (angle - current.startAngle);
      setStickers((prev) =>
        prev.map((item) =>
          item.id === current.id ? { ...item, rotation: nextRotation } : item,
        ),
      );
    }

    function onUp() {
      setInteract(null);
    }

    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    window.addEventListener("pointercancel", onUp);
    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      window.removeEventListener("pointercancel", onUp);
    };
  }, [interact]);

  function beginInteract(
    event: ReactPointerEvent,
    sticker: ShareCardSticker,
    mode: "move" | "scale" | "rotate",
  ) {
    event.preventDefault();
    event.stopPropagation();
    const box = previewRef.current?.getBoundingClientRect();
    if (!box || box.width <= 0 || box.height <= 0) return;

    const px = (event.clientX - box.left) / box.width;
    const py = (event.clientY - box.top) / box.height;
    // Prefer a stable pivot slightly above center when starting from the handle.
    const pivotX = sticker.x;
    const pivotY = sticker.y;
    try {
      event.currentTarget.setPointerCapture(event.pointerId);
    } catch {
      // ignore capture failures
    }
    setSelectedStickerId(sticker.id);
    setInteract({
      id: sticker.id,
      mode,
      offsetX: px - sticker.x,
      offsetY: py - sticker.y,
      centerX: pivotX,
      centerY: pivotY,
      startSize: sticker.size,
      startDist: Math.max(0.001, Math.hypot(px - pivotX, py - pivotY)),
      startAngle: (Math.atan2(py - pivotY, px - pivotX) * 180) / Math.PI,
      startRotation: sticker.rotation ?? 0,
    });
  }

  function updateSelectedSticker(
    patch: Partial<Pick<ShareCardSticker, "rotation" | "size">>,
  ) {
    if (!selectedStickerId) return;
    setStickers((prev) =>
      prev.map((item) =>
        item.id === selectedStickerId ? { ...item, ...patch } : item,
      ),
    );
  }

  const selectedSticker =
    stickers.find((item) => item.id === selectedStickerId) ?? null;

  const exportLines = cardBody
    .split(/\n+/)
    .map((line) => line.trim())
    .filter(Boolean);
  const canExport =
    Boolean(cardTitle.trim()) ||
    exportLines.length > 0 ||
    Boolean(backgroundUrl) ||
    stickers.length > 0;

  function buildPayload() {
    return {
      brand: "Knowledge Hub",
      moduleId,
      moduleIcon,
      title: cardTitle,
      lines: exportLines,
      backgroundDataUrl: backgroundUrl,
      stickers,
      typography,
    };
  }

  function patchTypography(patch: Partial<ShareCardTypography>) {
    setTypography((prev) => normalizeShareCardTypography({ ...prev, ...patch }));
  }

  useEffect(() => {
    if (!open) return;
    void ensureShareCardFontLoaded(typography.fontFamily);
  }, [open, typography.fontFamily]);

  const fontStack = resolveShareCardFontStack(typography.fontFamily);
  const previewTitleSize = `${(typography.titleSize / 54) * 1.5}rem`;
  const previewBodySize = `${(typography.bodySize / 28) * 0.875}rem`;

  async function handleDownload() {
    setBusy(true);
    setStatus(null);
    try {
      const blob = await renderShareCardPng(buildPayload());
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
      const blob = await renderShareCardPng(buildPayload());
      const ok = await copyBlobToClipboard(blob);
      setStatus(ok ? dict.shareCard.copied : dict.shareCard.copyFallback);
      if (!ok) downloadBlob(blob, `knowledge-hub-${moduleId}-card.png`);
    } catch {
      setStatus(dict.shareCard.failed);
    } finally {
      setBusy(false);
    }
  }

  async function handleBackgroundFiles(files: FileList | null) {
    const file = files?.[0];
    if (!file || !file.type.startsWith("image/")) return;
    try {
      const dataUrl = await readImageFileAsDataUrl(file);
      setBackgroundUrl(dataUrl);
    } catch {
      setStatus(dict.shareCard.failed);
    }
  }

  async function handleStickerFiles(files: FileList | null) {
    if (!files?.length) return;
    const next: ShareCardSticker[] = [];
    for (const file of Array.from(files)) {
      if (!file.type.startsWith("image/")) continue;
      try {
        const dataUrl = await readImageFileAsDataUrl(file);
        const id = `sticker-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
        next.push({
          id,
          dataUrl,
          x: 0.78,
          y: 0.22 + next.length * 0.1,
          size: 0.16,
          rotation: 0,
        });
      } catch {
        // skip unreadables
      }
    }
    if (next.length) {
      setStickers((prev) => [...prev, ...next]);
      setSelectedStickerId(next[next.length - 1]?.id ?? null);
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
            onClick={requestClose}
          >
            <div
              className="flex max-h-[min(92vh,820px)] w-full max-w-4xl flex-col overflow-hidden rounded-2xl border border-white/15 bg-[#080b10] shadow-2xl"
              onClick={(event) => event.stopPropagation()}
            >
              <div className="flex shrink-0 items-center justify-between gap-3 border-b border-white/10 px-5 py-4">
                <p className="text-sm font-medium text-white">
                  {dict.shareCard.title}
                </p>
                <button
                  type="button"
                  onClick={requestClose}
                  className="cursor-pointer rounded-full p-1.5 text-white/45 transition-colors hover:bg-white/10 hover:text-white"
                  aria-label={dict.shareCard.close}
                >
                  <X size={16} />
                </button>
              </div>

              <div className="grid min-h-0 flex-1 gap-0 overflow-y-auto md:grid-cols-[minmax(0,0.95fr)_minmax(0,1.2fr)]">
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

                  <div className="mt-6 border-t border-white/10 pt-5">
                    <p className="mb-3 text-[11px] tracking-[0.16em] text-white/35 uppercase">
                      {dict.shareCard.custom}
                    </p>
                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => bgInputRef.current?.click()}
                        className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-white/15 bg-white/5 px-3 py-1.5 text-xs text-white/75 transition-colors hover:border-white/30 hover:bg-white/10 hover:text-white"
                      >
                        <ImagePlus size={13} strokeWidth={1.75} />
                        {dict.shareCard.importBackground}
                      </button>
                      {backgroundUrl && (
                        <button
                          type="button"
                          onClick={() => setBackgroundUrl(null)}
                          className="cursor-pointer rounded-lg px-3 py-1.5 text-xs text-white/40 transition-colors hover:text-white/75"
                        >
                          {dict.shareCard.clearBackground}
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => stickerInputRef.current?.click()}
                        className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-white/15 bg-white/5 px-3 py-1.5 text-xs text-white/75 transition-colors hover:border-white/30 hover:bg-white/10 hover:text-white"
                      >
                        <Sparkles size={13} strokeWidth={1.75} />
                        {dict.shareCard.importStickers}
                      </button>
                      {stickers.length > 0 && (
                        <button
                          type="button"
                          onClick={() => {
                            setStickers([]);
                            setSelectedStickerId(null);
                          }}
                          className="cursor-pointer rounded-lg px-3 py-1.5 text-xs text-white/40 transition-colors hover:text-white/75"
                        >
                          {dict.shareCard.clearStickers}
                        </button>
                      )}
                    </div>
                    <p className="mt-2 text-[11px] leading-relaxed text-white/30">
                      {dict.shareCard.stickerHint}
                    </p>

                    <div className="mt-5 space-y-2.5 border-t border-white/10 pt-4">
                      <p className="text-[11px] tracking-[0.16em] text-white/35 uppercase">
                        {dict.shareCard.typography}
                      </p>
                      <label className="flex items-center gap-2 text-xs text-white/60">
                        <span className="w-14 shrink-0">
                          {dict.shareCard.fontFamily}
                        </span>
                        <select
                          value={typography.fontFamily}
                          onChange={(event) =>
                            patchTypography({
                              fontFamily: event.target.value as ShareCardFontId,
                            })
                          }
                          className="min-w-0 flex-1 cursor-pointer rounded border border-white/15 bg-black/35 px-2 py-1.5 text-white/80 outline-none focus:border-white/40"
                        >
                          {SHARE_CARD_FONT_OPTIONS.map((option) => (
                            <option key={option.id} value={option.id}>
                              {shareCardFontLabel(option.id, locale)}
                            </option>
                          ))}
                        </select>
                      </label>
                      <p className="text-[11px] leading-relaxed text-white/30">
                        {dict.shareCard.fontLibraryHint}
                      </p>
                      <label className="flex items-center gap-2 text-xs text-white/60">
                        <span className="w-14 shrink-0">
                          {dict.shareCard.titleSize}
                        </span>
                        <input
                          type="range"
                          min={28}
                          max={80}
                          step={1}
                          value={typography.titleSize}
                          onChange={(event) =>
                            patchTypography({
                              titleSize: Number(event.target.value),
                            })
                          }
                          className="min-w-0 flex-1 accent-white"
                        />
                        <input
                          type="number"
                          min={28}
                          max={80}
                          value={typography.titleSize}
                          onChange={(event) => {
                            const next = Number(event.target.value);
                            if (!Number.isFinite(next)) return;
                            patchTypography({ titleSize: next });
                          }}
                          className="w-14 shrink-0 rounded border border-white/15 bg-black/35 px-1.5 py-0.5 text-right tabular-nums text-white/80 outline-none focus:border-white/40 [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                        />
                      </label>
                      <label className="flex items-center gap-2 text-xs text-white/60">
                        <span className="w-14 shrink-0">
                          {dict.shareCard.bodySize}
                        </span>
                        <input
                          type="range"
                          min={16}
                          max={48}
                          step={1}
                          value={typography.bodySize}
                          onChange={(event) =>
                            patchTypography({
                              bodySize: Number(event.target.value),
                            })
                          }
                          className="min-w-0 flex-1 accent-white"
                        />
                        <input
                          type="number"
                          min={16}
                          max={48}
                          value={typography.bodySize}
                          onChange={(event) => {
                            const next = Number(event.target.value);
                            if (!Number.isFinite(next)) return;
                            patchTypography({ bodySize: next });
                          }}
                          className="w-14 shrink-0 rounded border border-white/15 bg-black/35 px-1.5 py-0.5 text-right tabular-nums text-white/80 outline-none focus:border-white/40 [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                        />
                      </label>
                      <label className="flex items-center gap-2 text-xs text-white/60">
                        <span className="w-14 shrink-0">
                          {dict.shareCard.titleColor}
                        </span>
                        <input
                          type="color"
                          value={
                            /^#[0-9a-fA-F]{6}$/.test(typography.titleColor)
                              ? typography.titleColor
                              : "#ffffff"
                          }
                          onChange={(event) =>
                            patchTypography({ titleColor: event.target.value })
                          }
                          className="h-8 w-10 cursor-pointer rounded border border-white/15 bg-transparent p-0.5"
                        />
                        <input
                          type="text"
                          value={typography.titleColor}
                          onChange={(event) =>
                            patchTypography({ titleColor: event.target.value })
                          }
                          className="min-w-0 flex-1 rounded border border-white/15 bg-black/35 px-2 py-1 text-white/80 outline-none focus:border-white/40"
                        />
                      </label>
                      <label className="flex items-center gap-2 text-xs text-white/60">
                        <span className="w-14 shrink-0">
                          {dict.shareCard.bodyColor}
                        </span>
                        <input
                          type="color"
                          value={
                            /^#[0-9a-fA-F]{6}$/.test(typography.bodyColor)
                              ? typography.bodyColor
                              : "#e8eaed"
                          }
                          onChange={(event) =>
                            patchTypography({ bodyColor: event.target.value })
                          }
                          className="h-8 w-10 cursor-pointer rounded border border-white/15 bg-transparent p-0.5"
                        />
                        <input
                          type="text"
                          value={typography.bodyColor}
                          onChange={(event) =>
                            patchTypography({ bodyColor: event.target.value })
                          }
                          className="min-w-0 flex-1 rounded border border-white/15 bg-black/35 px-2 py-1 text-white/80 outline-none focus:border-white/40"
                        />
                      </label>
                    </div>

                    <input
                      ref={bgInputRef}
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(event) => {
                        void handleBackgroundFiles(event.target.files);
                        event.target.value = "";
                      }}
                    />
                    <input
                      ref={stickerInputRef}
                      type="file"
                      accept="image/*"
                      multiple
                      className="hidden"
                      onChange={(event) => {
                        void handleStickerFiles(event.target.files);
                        event.target.value = "";
                      }}
                    />
                  </div>

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

                  <div
                    ref={previewRef}
                    className="relative aspect-[16/9] overflow-hidden rounded-xl border border-white/20 bg-[#05070a]"
                    onPointerDown={() => setSelectedStickerId(null)}
                  >
                    {backgroundUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={backgroundUrl}
                        alt=""
                        className="absolute inset-0 h-full w-full object-cover"
                      />
                    ) : (
                      <div
                        className="pointer-events-none absolute inset-0 opacity-40"
                        style={{
                          backgroundImage:
                            "linear-gradient(rgba(255,255,255,0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.05) 1px, transparent 1px)",
                          backgroundSize: "28px 28px",
                        }}
                        aria-hidden
                      />
                    )}
                    {backgroundUrl && (
                      <div
                        className="pointer-events-none absolute inset-0 bg-black/45"
                        aria-hidden
                      />
                    )}

                    <div className="relative z-10 space-y-3 p-5 sm:space-y-4 sm:p-7">
                      <p
                        className="text-[11px] tracking-[0.18em] text-white/55"
                        style={{ fontFamily: fontStack }}
                      >
                        ▸  Knowledge Hub
                      </p>
                      <div className="flex items-start gap-3">
                        <span
                          className="mt-1 text-lg text-white/70"
                          aria-hidden
                          style={{ fontFamily: fontStack }}
                        >
                          {moduleIcon}
                        </span>
                        <input
                          value={cardTitle}
                          onChange={(event) => setCardTitle(event.target.value)}
                          placeholder={dict.home.titlePlaceholder}
                          className="min-w-0 flex-1 bg-transparent leading-snug outline-none placeholder:opacity-40"
                          style={{
                            fontFamily: fontStack,
                            fontSize: previewTitleSize,
                            color: typography.titleColor,
                          }}
                        />
                      </div>
                      <div className="h-px w-12 bg-white/50" />
                      <textarea
                        value={cardBody}
                        onChange={(event) => setCardBody(event.target.value)}
                        rows={4}
                        placeholder={dict.shareCard.previewEmpty}
                        className="w-full resize-none bg-transparent leading-relaxed outline-none placeholder:opacity-40"
                        style={{
                          fontFamily: fontStack,
                          fontSize: previewBodySize,
                          color: typography.bodyColor,
                        }}
                      />
                      <p
                        className="pt-1 text-[11px] text-white/35"
                        style={{ fontFamily: fontStack }}
                      >
                        {moduleId} · Knowledge Hub
                      </p>
                    </div>

                    {stickers.map((sticker) => {
                      const selected = selectedStickerId === sticker.id;
                      const active =
                        interact?.id === sticker.id ? interact.mode : null;
                      const rotation = sticker.rotation ?? 0;
                      return (
                        <div key={sticker.id} className="contents">
                          {/* Visual (rotated) */}
                          <div
                            className="pointer-events-none absolute z-20"
                            style={{
                              left: `${sticker.x * 100}%`,
                              top: `${sticker.y * 100}%`,
                              width: `${sticker.size * 100}%`,
                              transform: `translate(-50%, -50%) rotate(${rotation}deg)`,
                              transformOrigin: "center center",
                            }}
                          >
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                              src={sticker.dataUrl}
                              alt=""
                              draggable={false}
                              className={`h-auto w-full select-none drop-shadow-md ${
                                selected
                                  ? "outline outline-1 outline-white/70"
                                  : ""
                              }`}
                            />
                          </div>

                          {/* Controls (axis-aligned, always hittable) */}
                          <div
                            className={`absolute z-30 touch-none ${
                              active === "move"
                                ? "cursor-grabbing"
                                : "cursor-grab"
                            }`}
                            style={{
                              left: `${sticker.x * 100}%`,
                              top: `${sticker.y * 100}%`,
                              width: `${sticker.size * 100}%`,
                              aspectRatio: "1",
                              transform: "translate(-50%, -50%)",
                            }}
                            onPointerDown={(event) =>
                              beginInteract(event, sticker, "move")
                            }
                            onClick={(event) => {
                              event.stopPropagation();
                              setSelectedStickerId(sticker.id);
                            }}
                          >
                            {selected && (
                              <div className="pointer-events-none absolute inset-0 rounded-sm border border-dashed border-white/45" />
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {selectedSticker && (
                    <div className="mt-3 space-y-2 rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2.5">
                      <label className="flex items-center gap-2 text-xs text-white/60 sm:gap-3">
                        <span className="w-10 shrink-0">
                          {dict.shareCard.rotateSticker}
                        </span>
                        <input
                          type="range"
                          min={-180}
                          max={180}
                          step={1}
                          value={normalizeRotationDisplay(
                            selectedSticker.rotation ?? 0,
                          )}
                          onChange={(event) =>
                            updateSelectedSticker({
                              rotation: Number(event.target.value),
                            })
                          }
                          className="min-w-0 flex-1 accent-white"
                        />
                        <input
                          type="number"
                          min={-180}
                          max={180}
                          step={1}
                          value={normalizeRotationDisplay(
                            selectedSticker.rotation ?? 0,
                          )}
                          onChange={(event) => {
                            const raw = event.target.value;
                            if (raw === "" || raw === "-") return;
                            const next = Number(raw);
                            if (!Number.isFinite(next)) return;
                            updateSelectedSticker({
                              rotation: clamp(next, -180, 180),
                            });
                          }}
                          onBlur={(event) => {
                            const next = Number(event.target.value);
                            updateSelectedSticker({
                              rotation: Number.isFinite(next)
                                ? clamp(next, -180, 180)
                                : 0,
                            });
                          }}
                          className="w-14 shrink-0 rounded border border-white/15 bg-black/35 px-1.5 py-0.5 text-right tabular-nums text-white/80 outline-none focus:border-white/40 [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                          aria-label={dict.shareCard.rotateSticker}
                        />
                        <span className="w-3 shrink-0 text-white/40">°</span>
                      </label>
                      <label className="flex items-center gap-2 text-xs text-white/60 sm:gap-3">
                        <span className="w-10 shrink-0">
                          {dict.shareCard.scaleSticker}
                        </span>
                        <input
                          type="range"
                          min={6}
                          max={55}
                          step={1}
                          value={Math.round(selectedSticker.size * 100)}
                          onChange={(event) =>
                            updateSelectedSticker({
                              size: Number(event.target.value) / 100,
                            })
                          }
                          className="min-w-0 flex-1 accent-white"
                        />
                        <input
                          type="number"
                          min={6}
                          max={55}
                          step={1}
                          value={Math.round(selectedSticker.size * 100)}
                          onChange={(event) => {
                            const raw = event.target.value;
                            if (raw === "") return;
                            const next = Number(raw);
                            if (!Number.isFinite(next)) return;
                            updateSelectedSticker({
                              size: clamp(next, 6, 55) / 100,
                            });
                          }}
                          onBlur={(event) => {
                            const next = Number(event.target.value);
                            updateSelectedSticker({
                              size: Number.isFinite(next)
                                ? clamp(next, 6, 55) / 100
                                : 0.16,
                            });
                          }}
                          className="w-14 shrink-0 rounded border border-white/15 bg-black/35 px-1.5 py-0.5 text-right tabular-nums text-white/80 outline-none focus:border-white/40 [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                          aria-label={dict.shareCard.scaleSticker}
                        />
                        <span className="w-3 shrink-0 text-white/40">%</span>
                      </label>
                      <button
                        type="button"
                        onClick={() => {
                          const id = selectedSticker.id;
                          setStickers((prev) =>
                            prev.filter((item) => item.id !== id),
                          );
                          setSelectedStickerId(null);
                        }}
                        className="w-full cursor-pointer rounded-md border border-white/15 px-2 py-1.5 text-xs text-white/55 transition-colors hover:border-white/30 hover:bg-white/5 hover:text-white/85"
                      >
                        {dict.shareCard.removeSticker}
                      </button>
                    </div>
                  )}

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
                    <button
                      type="button"
                      disabled={busy || !dirty}
                      onClick={handleSaveChanges}
                      className="cursor-pointer rounded-full border border-white/25 px-4 py-2 text-xs text-white/80 transition-colors hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      {dict.shareCard.saveChanges}
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

  const openButton = (
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
      className={
        immersive
          ? "inline-flex cursor-pointer items-center gap-1.5 rounded-full border border-white/35 bg-black/35 px-3 py-1.5 text-xs text-white shadow-lg backdrop-blur-md transition-colors hover:bg-white/15"
          : floating
            ? "inline-flex cursor-pointer items-center gap-1.5 rounded-full border border-border/80 bg-background/90 px-3 py-1.5 text-xs text-foreground shadow-lg backdrop-blur-md transition-colors hover:border-accent/40 hover:bg-surface"
            : "inline-flex cursor-pointer items-center gap-1.5 rounded-full border border-border px-3 py-1.5 text-xs text-muted transition-colors hover:border-accent/40 hover:bg-surface hover:text-foreground"
      }
      title={dict.shareCard.open}
    >
      <Share2 size={13} strokeWidth={1.75} />
      {dict.shareCard.open}
    </button>
  );

  return (
    <>
      {floating ? (
        <div className="pointer-events-none fixed top-[4.75rem] right-4 z-40 sm:right-6">
          <div className="pointer-events-auto">{openButton}</div>
        </div>
      ) : (
        openButton
      )}
      {dialog}
      <ConfirmDialog
        open={exitPromptOpen}
        message={dict.shareCard.unsavedConfirm}
        confirmLabel={dict.shareCard.saveChanges}
        cancelLabel={dict.shareCard.discardChanges}
        danger={false}
        onConfirm={confirmSaveAndExit}
        onCancel={discardAndExit}
      />
    </>
  );
}
