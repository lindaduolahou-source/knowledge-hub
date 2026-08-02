"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createPortal } from "react-dom";
import {
  BookmarkPlus,
  BookMarked,
  Copy,
  Download,
  FileDown,
  FileUp,
  LayoutTemplate,
  Pencil,
  Plus,
  Trash2,
  X,
} from "lucide-react";
import { BackToExplore } from "@/components/BackToExplore";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { VaultCardEditor } from "@/components/VaultCardEditor";
import type { Locale } from "@/i18n/config";
import type { Dictionary } from "@/i18n/dictionaries/zh";
import { useModuleLayout } from "@/hooks/useModuleLayout";
import { useModuleTitle } from "@/hooks/useModuleTitle";
import {
  copyBlobToClipboard,
  downloadBlob,
  renderShareCardPng,
} from "@/lib/share-card";
import {
  libraryItemToTemplate,
  loadLibraryTemplates,
  removeLibraryTemplate,
  saveTemplateToLibrary,
  saveVaultCardToLibrary,
  SHARE_CARD_LIBRARY_EVENT,
  type LibraryTemplate,
} from "@/lib/share-card-library";
import {
  BUILTIN_CARD_TEMPLATES,
  builtinTemplateToShareCard,
  downloadShareCardTemplate,
  importTemplateToVault,
  readShareCardTemplateFile,
  type ShareCardTemplate,
} from "@/lib/share-card-template";
import {
  createVaultCard,
  emptyShareCardDraft,
  getVaultCard,
  loadVaultCards,
  removeVaultCard,
  SHARE_CARD_VAULT_EVENT,
  type VaultCard,
} from "@/lib/share-card-vault";
import { isBuiltinModuleId, type ModuleConfig } from "@/lib/modules";
import { resolveModuleConfig } from "@/lib/module-layout";
import { moduleTitleKey, resolveModuleContent } from "@/lib/module-content";

interface HubCardsPageProps {
  locale: Locale;
  dict: Dictionary;
}

function ModulePickRow({
  locale,
  dict,
  module,
  onPick,
}: {
  locale: Locale;
  dict: Dictionary;
  module: ModuleConfig;
  onPick: (module: ModuleConfig) => void;
}) {
  const defaultTitle = isBuiltinModuleId(module.id)
    ? dict.modules[module.id].title
    : dict.home.newModuleTitle;
  const title = useModuleTitle(locale, module.id, defaultTitle);

  return (
    <li>
      <button
        type="button"
        onClick={() => onPick(module)}
        className="flex w-full cursor-pointer items-center gap-3 rounded-xl border border-white/15 bg-white/[0.05] px-4 py-3.5 text-left transition-colors hover:border-white/30 hover:bg-white/[0.1]"
      >
        <span className="text-base text-white/55" aria-hidden>
          {module.icon}
        </span>
        <span className="min-w-0 flex-1 truncate text-sm text-white/90">
          {title}
        </span>
      </button>
    </li>
  );
}

function formatUpdatedAt(value: string, locale: Locale) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString(locale === "zh" ? "zh-CN" : "en-US", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function HubCardsPage({ locale, dict }: HubCardsPageProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { active, ready: modulesReady } = useModuleLayout();
  const [cards, setCards] = useState<VaultCard[]>([]);
  const [ready, setReady] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [templateOpen, setTemplateOpen] = useState(false);
  const [libraryOpen, setLibraryOpen] = useState(false);
  const [libraryDetailId, setLibraryDetailId] = useState<string | null>(null);
  const [openedFromLibrary, setOpenedFromLibrary] = useState(false);
  const [libraryItems, setLibraryItems] = useState<LibraryTemplate[]>([]);
  const [mounted, setMounted] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editorOpen, setEditorOpen] = useState(false);
  const [pendingRemoveId, setPendingRemoveId] = useState<string | null>(null);
  const [pendingRemoveLibraryId, setPendingRemoveLibraryId] = useState<
    string | null
  >(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const creatingFromQuery = useRef(false);
  const templateInputRef = useRef<HTMLInputElement>(null);
  const libraryInputRef = useRef<HTMLInputElement>(null);

  function refresh() {
    setCards(loadVaultCards());
    setReady(true);
  }

  function refreshLibrary() {
    setLibraryItems(loadLibraryTemplates());
  }

  useEffect(() => {
    setMounted(true);
    refresh();
    refreshLibrary();
    function onUpdate() {
      refresh();
    }
    function onLibraryUpdate() {
      refreshLibrary();
    }
    window.addEventListener(SHARE_CARD_VAULT_EVENT, onUpdate);
    window.addEventListener(SHARE_CARD_LIBRARY_EVENT, onLibraryUpdate);
    window.addEventListener("storage", onUpdate);
    window.addEventListener("storage", onLibraryUpdate);
    return () => {
      window.removeEventListener(SHARE_CARD_VAULT_EVENT, onUpdate);
      window.removeEventListener(SHARE_CARD_LIBRARY_EVENT, onLibraryUpdate);
      window.removeEventListener("storage", onUpdate);
      window.removeEventListener("storage", onLibraryUpdate);
    };
  }, []);

  useEffect(() => {
    if (!ready) return;
    const createModuleId = searchParams.get("new");
    if (!createModuleId) {
      creatingFromQuery.current = false;
      return;
    }
    if (creatingFromQuery.current) return;
    creatingFromQuery.current = true;
    startCreate(createModuleId);
    clearNewQuery();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, searchParams]);

  function clearNewQuery() {
    if (!searchParams.get("new")) return;
    router.replace(`/${locale}/hub/cards`, { scroll: false });
  }

  const editingCard = useMemo(
    () => (editingId ? (getVaultCard(editingId) ?? cards.find((c) => c.id === editingId) ?? null) : null),
    [editingId, cards],
  );

  function startCreate(moduleId: string) {
    const mod = resolveModuleConfig(moduleId);
    const titleDefault = isBuiltinModuleId(moduleId)
      ? dict.modules[moduleId].title
      : dict.home.newModuleTitle;
    const liveTitle = resolveModuleContent(
      locale,
      moduleTitleKey(moduleId),
      titleDefault,
    );
    const draft = emptyShareCardDraft();
    draft.cardTitle = liveTitle;
    const card = createVaultCard({
      moduleId,
      moduleIcon: mod.icon,
      name: liveTitle || dict.shareCard.newVaultCard,
      draft,
    });
    setCards(loadVaultCards());
    setEditingId(card.id);
    setEditorOpen(true);
    setPickerOpen(false);
    setStatus(null);
  }

  function openEditor(cardId: string) {
    setEditingId(cardId);
    setEditorOpen(true);
    setStatus(null);
  }

  async function shareCard(
    card: VaultCard,
    mode: "download" | "copy",
  ) {
    setBusyId(card.id);
    setStatus(null);
    try {
      const blob = await renderShareCardPng({
        brand: "Knowledge Hub",
        moduleId: card.moduleId,
        moduleIcon: card.moduleIcon,
        title: card.draft.cardTitle,
        lines: card.draft.cardBody
          .split(/\n\s*\n/)
          .map((line) => line.trim())
          .filter(Boolean),
        backgroundDataUrl: card.draft.backgroundUrl,
        stickers: card.draft.stickers,
        typography: card.draft.typography,
      });
      if (mode === "download") {
        downloadBlob(blob, `knowledge-hub-${card.id}-card.png`);
        setStatus(dict.shareCard.downloaded);
      } else {
        const ok = await copyBlobToClipboard(blob);
        setStatus(ok ? dict.shareCard.copied : dict.shareCard.copyFallback);
        if (!ok) downloadBlob(blob, `knowledge-hub-${card.id}-card.png`);
      }
    } catch {
      setStatus(dict.shareCard.failed);
    } finally {
      setBusyId(null);
    }
  }

  function confirmRemove() {
    if (!pendingRemoveId) return;
    if (editingId === pendingRemoveId) {
      setEditorOpen(false);
      setEditingId(null);
    }
    removeVaultCard(pendingRemoveId);
    setPendingRemoveId(null);
    refresh();
  }

  function applyTemplate(
    template: ShareCardTemplate,
    options?: { fromLibrary?: boolean },
  ) {
    const moduleId =
      template.moduleId &&
      (isBuiltinModuleId(template.moduleId) ||
        active.some((module) => module.id === template.moduleId))
        ? template.moduleId
        : (active[0]?.id ?? "space");
    const mod = resolveModuleConfig(moduleId);
    const card = importTemplateToVault(template, {
      moduleId,
      moduleIcon: template.moduleIcon || mod.icon,
    });
    setCards(loadVaultCards());
    setTemplateOpen(false);
    if (options?.fromLibrary) {
      setLibraryOpen(false);
      setOpenedFromLibrary(true);
    } else {
      setOpenedFromLibrary(false);
    }
    setEditingId(card.id);
    setEditorOpen(true);
    setStatus(dict.hub.vaultImportSuccess);
  }

  function returnToLibrary() {
    setEditorOpen(false);
    setEditingId(null);
    setOpenedFromLibrary(false);
    refresh();
    refreshLibrary();
    setLibraryDetailId(null);
    setLibraryOpen(true);
  }

  const libraryDetail = libraryDetailId
    ? (libraryItems.find((item) => item.id === libraryDetailId) ?? null)
    : null;

  async function handleTemplateFile(files: FileList | null) {
    const file = files?.[0];
    if (!file) return;
    try {
      const template = await readShareCardTemplateFile(file);
      applyTemplate(template);
    } catch {
      setStatus(dict.hub.vaultImportFailed);
    } finally {
      if (templateInputRef.current) templateInputRef.current.value = "";
    }
  }

  async function handleLibraryFile(files: FileList | null) {
    const file = files?.[0];
    if (!file) return;
    try {
      const template = await readShareCardTemplateFile(file);
      saveTemplateToLibrary(template);
      refreshLibrary();
      setStatus(dict.hub.vaultImportedToLibrary);
    } catch {
      setStatus(dict.hub.vaultImportFailed);
    } finally {
      if (libraryInputRef.current) libraryInputRef.current.value = "";
    }
  }

  function exportTemplate(card: VaultCard) {
    downloadShareCardTemplate(card);
    setStatus(dict.hub.vaultExportSuccess);
  }

  function saveCardToLibrary(card: VaultCard) {
    saveVaultCardToLibrary(card);
    refreshLibrary();
    setStatus(dict.hub.vaultSavedToLibrary);
  }

  function confirmRemoveLibrary() {
    if (!pendingRemoveLibraryId) return;
    if (libraryDetailId === pendingRemoveLibraryId) {
      setLibraryDetailId(null);
    }
    removeLibraryTemplate(pendingRemoveLibraryId);
    setPendingRemoveLibraryId(null);
    refreshLibrary();
  }

  const pickerDialog =
    pickerOpen && mounted
      ? createPortal(
          <div
            className="fixed inset-0 z-[100] flex items-end justify-center bg-black/70 p-4 sm:items-center"
            role="dialog"
            aria-modal="true"
            aria-label={dict.shareCard.pickModuleTitle}
            onClick={() => setPickerOpen(false)}
          >
            <div
              className="flex max-h-[min(80vh,560px)] w-full max-w-md flex-col overflow-hidden rounded-2xl border border-white/15 bg-[#080b10] shadow-2xl"
              onClick={(event) => event.stopPropagation()}
            >
              <div className="flex shrink-0 items-center justify-between gap-3 border-b border-white/10 px-5 py-4">
                <div>
                  <p className="text-sm font-medium text-white">
                    {dict.shareCard.pickModuleTitle}
                  </p>
                  <p className="mt-1 text-xs text-white/40">
                    {dict.hub.vaultPickHint}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setPickerOpen(false)}
                  className="cursor-pointer rounded-full p-1.5 text-white/45 transition-colors hover:bg-white/10 hover:text-white"
                  aria-label={dict.shareCard.close}
                >
                  <X size={16} />
                </button>
              </div>
              <ul className="space-y-2 overflow-y-auto p-4">
                {!modulesReady && (
                  <li className="px-1 py-6 text-center text-xs text-white/35">
                    …
                  </li>
                )}
                {modulesReady &&
                  active.map((module) => (
                    <ModulePickRow
                      key={module.id}
                      locale={locale}
                      dict={dict}
                      module={module}
                      onPick={(mod) => startCreate(mod.id)}
                    />
                  ))}
                {modulesReady && active.length === 0 && (
                  <li className="px-1 py-6 text-center text-xs text-white/35">
                    {dict.shareCard.pickModuleEmpty}
                  </li>
                )}
              </ul>
            </div>
          </div>,
          document.body,
        )
      : null;

  const templateDialog =
    templateOpen && mounted
      ? createPortal(
          <div
            className="fixed inset-0 z-[100] flex items-end justify-center bg-black/70 p-4 sm:items-center"
            role="dialog"
            aria-modal="true"
            aria-label={dict.hub.vaultTemplates}
            onClick={() => setTemplateOpen(false)}
          >
            <div
              className="flex max-h-[min(85vh,640px)] w-full max-w-lg flex-col overflow-hidden rounded-2xl border border-white/15 bg-[#080b10] shadow-2xl"
              onClick={(event) => event.stopPropagation()}
            >
              <div className="flex shrink-0 items-center justify-between gap-3 border-b border-white/10 px-5 py-4">
                <div>
                  <p className="text-sm font-medium text-white">
                    {dict.hub.vaultTemplates}
                  </p>
                  <p className="mt-1 text-xs text-white/40">
                    {dict.hub.vaultTemplatesHint}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setTemplateOpen(false)}
                  className="cursor-pointer rounded-full p-1.5 text-white/45 transition-colors hover:bg-white/10 hover:text-white"
                  aria-label={dict.shareCard.close}
                >
                  <X size={16} />
                </button>
              </div>

              <div className="space-y-5 overflow-y-auto p-4">
                <div>
                  <button
                    type="button"
                    onClick={() => templateInputRef.current?.click()}
                    className="flex w-full cursor-pointer items-center justify-center gap-2 rounded-xl border border-dashed border-white/25 bg-white/[0.03] px-4 py-4 text-sm text-white/75 transition-colors hover:border-white/40 hover:bg-white/[0.06]"
                  >
                    <FileUp size={16} strokeWidth={1.75} />
                    {dict.hub.vaultImportFile}
                  </button>
                  <input
                    ref={templateInputRef}
                    type="file"
                    accept="application/json,.json"
                    className="hidden"
                    onChange={(event) =>
                      void handleTemplateFile(event.target.files)
                    }
                  />
                </div>

                <div>
                  <p className="mb-2 text-[11px] tracking-[0.16em] text-white/35 uppercase">
                    {dict.hub.vaultBuiltinTemplates}
                  </p>
                  <ul className="space-y-2">
                    {BUILTIN_CARD_TEMPLATES.map((template) => {
                      const name =
                        locale === "zh" ? template.nameZh : template.nameEn;
                      const description =
                        locale === "zh"
                          ? template.descriptionZh
                          : template.descriptionEn;
                      return (
                        <li key={template.id}>
                          <button
                            type="button"
                            onClick={() => {
                              const next = builtinTemplateToShareCard(template);
                              next.name =
                                locale === "zh"
                                  ? template.nameZh
                                  : template.nameEn;
                              applyTemplate(next);
                            }}
                            className="flex w-full cursor-pointer items-start gap-3 rounded-xl border border-white/15 bg-white/[0.04] px-4 py-3.5 text-left transition-colors hover:border-white/30 hover:bg-white/[0.08]"
                          >
                            <span
                              className="mt-0.5 text-base text-white/50"
                              aria-hidden
                            >
                              {template.moduleIcon}
                            </span>
                            <span className="min-w-0 flex-1">
                              <span className="block text-sm text-white/90">
                                {name}
                              </span>
                              <span className="mt-1 block text-xs text-white/40">
                                {description}
                              </span>
                            </span>
                            <span className="shrink-0 text-[11px] text-accent">
                              {dict.hub.vaultUseTemplate}
                            </span>
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              </div>
            </div>
          </div>,
          document.body,
        )
      : null;

  const libraryDialog =
    libraryOpen && mounted
      ? createPortal(
          <div
            className="fixed inset-0 z-[100] flex items-end justify-center bg-black/70 p-4 sm:items-center"
            role="dialog"
            aria-modal="true"
            aria-label={dict.hub.vaultMyLibrary}
            onClick={() => {
              if (libraryDetailId) {
                setLibraryDetailId(null);
                return;
              }
              setLibraryOpen(false);
            }}
          >
            <div
              className="flex max-h-[min(85vh,640px)] w-full max-w-lg flex-col overflow-hidden rounded-2xl border border-white/15 bg-[#080b10] shadow-2xl"
              onClick={(event) => event.stopPropagation()}
            >
              <div className="flex shrink-0 items-center justify-between gap-3 border-b border-white/10 px-5 py-4">
                <div className="min-w-0">
                  {libraryDetail ? (
                    <>
                      <button
                        type="button"
                        onClick={() => setLibraryDetailId(null)}
                        className="mb-2 cursor-pointer rounded-full border border-white/20 px-2.5 py-1 text-[11px] text-white/70 transition-colors hover:bg-white/10 hover:text-white"
                      >
                        ← {dict.hub.vaultBackToLibrary}
                      </button>
                      <p className="truncate text-sm font-medium text-white">
                        {libraryDetail.name}
                      </p>
                      <p className="mt-1 text-xs text-white/40">
                        {dict.hub.vaultTemplatePreview}
                      </p>
                    </>
                  ) : (
                    <>
                      <p className="text-sm font-medium text-white">
                        {dict.hub.vaultMyLibrary}
                      </p>
                      <p className="mt-1 text-xs text-white/40">
                        {dict.hub.vaultMyLibraryHint}
                      </p>
                    </>
                  )}
                </div>
                {!libraryDetail ? (
                  <button
                    type="button"
                    onClick={() => setLibraryOpen(false)}
                    className="cursor-pointer rounded-full p-1.5 text-white/45 transition-colors hover:bg-white/10 hover:text-white"
                    aria-label={dict.shareCard.close}
                  >
                    <X size={16} />
                  </button>
                ) : (
                  <span className="w-8" aria-hidden />
                )}
              </div>

              <div className="space-y-4 overflow-y-auto p-4">
                {libraryDetail ? (
                  <>
                    <div
                      className="relative aspect-[16/9] w-full overflow-hidden rounded-xl border border-white/10 bg-[#05070a]"
                      style={
                        libraryDetail.draft.backgroundUrl
                          ? {
                              backgroundImage: `linear-gradient(rgba(5,7,10,0.45), rgba(5,7,10,0.55)), url(${libraryDetail.draft.backgroundUrl})`,
                              backgroundSize: "cover",
                              backgroundPosition: "center",
                            }
                          : undefined
                      }
                    >
                      <div className="absolute inset-0 flex flex-col justify-end p-4">
                        <p className="mb-1 text-[10px] tracking-[0.16em] text-white/40 uppercase">
                          {libraryDetail.moduleIcon || "◇"} Knowledge Hub
                        </p>
                        <p className="line-clamp-2 text-lg font-medium text-white">
                          {libraryDetail.draft.cardTitle || libraryDetail.name}
                        </p>
                        {libraryDetail.draft.cardBody.trim() ? (
                          <p className="mt-2 line-clamp-3 text-xs leading-relaxed text-white/55">
                            {libraryDetail.draft.cardBody}
                          </p>
                        ) : null}
                      </div>
                    </div>
                    <p className="text-[11px] text-white/35">
                      {dict.hub.vaultUpdated}{" "}
                      {formatUpdatedAt(libraryDetail.updatedAt, locale)}
                    </p>
                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() =>
                          applyTemplate(libraryItemToTemplate(libraryDetail), {
                            fromLibrary: true,
                          })
                        }
                        className="inline-flex flex-1 cursor-pointer items-center justify-center rounded-full border border-accent/40 bg-accent/10 px-4 py-2 text-xs text-accent transition-colors hover:bg-accent/20"
                      >
                        {dict.hub.vaultUseTemplate}
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          setPendingRemoveLibraryId(libraryDetail.id)
                        }
                        className="inline-flex cursor-pointer items-center justify-center rounded-full border border-white/20 px-4 py-2 text-xs text-white/55 transition-colors hover:bg-white/10 hover:text-white/80"
                      >
                        {dict.hub.vaultRemoveFromLibrary}
                      </button>
                    </div>
                  </>
                ) : (
                  <>
                    <button
                      type="button"
                      onClick={() => libraryInputRef.current?.click()}
                      className="flex w-full cursor-pointer items-center justify-center gap-2 rounded-xl border border-dashed border-white/25 bg-white/[0.03] px-4 py-3.5 text-sm text-white/75 transition-colors hover:border-white/40 hover:bg-white/[0.06]"
                    >
                      <FileUp size={16} strokeWidth={1.75} />
                      {dict.hub.vaultImportToLibrary}
                    </button>
                    <input
                      ref={libraryInputRef}
                      type="file"
                      accept="application/json,.json"
                      className="hidden"
                      onChange={(event) =>
                        void handleLibraryFile(event.target.files)
                      }
                    />

                    {libraryItems.length === 0 ? (
                      <p className="px-1 py-8 text-center text-xs text-white/35">
                        {dict.hub.vaultMyLibraryEmpty}
                      </p>
                    ) : (
                      <ul className="space-y-2">
                        {libraryItems.map((item) => (
                          <li
                            key={item.id}
                            className="flex items-start gap-2 rounded-xl border border-white/15 bg-white/[0.04] px-3 py-3"
                          >
                            <button
                              type="button"
                              onClick={() => setLibraryDetailId(item.id)}
                              className="flex min-w-0 flex-1 cursor-pointer items-start gap-3 text-left transition-opacity hover:opacity-90"
                            >
                              <span
                                className="mt-0.5 text-base text-white/50"
                                aria-hidden
                              >
                                {item.moduleIcon || "◇"}
                              </span>
                              <span className="min-w-0 flex-1">
                                <span className="block truncate text-sm text-white/90">
                                  {item.name}
                                </span>
                                <span className="mt-1 block text-[11px] text-white/35">
                                  {dict.hub.vaultUpdated}{" "}
                                  {formatUpdatedAt(item.updatedAt, locale)}
                                </span>
                              </span>
                              <span className="shrink-0 text-[11px] text-accent">
                                {dict.hub.vaultOpenTemplate} →
                              </span>
                            </button>
                            <button
                              type="button"
                              onClick={() =>
                                setPendingRemoveLibraryId(item.id)
                              }
                              className="mt-0.5 cursor-pointer rounded-full p-1.5 text-white/30 transition-colors hover:bg-white/10 hover:text-white/75"
                              aria-label={dict.hub.vaultRemoveFromLibrary}
                              title={dict.hub.vaultRemoveFromLibrary}
                            >
                              <Trash2 size={13} strokeWidth={1.75} />
                            </button>
                          </li>
                        ))}
                      </ul>
                    )}
                  </>
                )}
              </div>
            </div>
          </div>,
          document.body,
        )
      : null;

  return (
    <section className="relative flex min-h-[calc(100dvh-3.5rem)] w-full flex-col px-6 py-12">
      <div
        className="landing-nebula pointer-events-none absolute inset-0 opacity-70"
        aria-hidden
      />
      <BackToExplore locale={locale} label={dict.hub.backToHub} />

      <div className="relative z-10 mx-auto w-full max-w-2xl pt-2">
        <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="font-handwrite mb-2 text-3xl text-white sm:text-4xl">
              {dict.hub.vaultTitle}
            </h1>
            <p className="text-sm text-white/45">{dict.hub.vaultHint}</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => {
                refreshLibrary();
                setLibraryDetailId(null);
                setLibraryOpen(true);
              }}
              className="inline-flex cursor-pointer items-center gap-1.5 rounded-full border border-white/25 px-4 py-2 text-xs text-white/80 transition-colors hover:bg-white/10"
            >
              <BookMarked size={14} strokeWidth={1.75} />
              {dict.hub.vaultMyLibrary}
            </button>
            <button
              type="button"
              onClick={() => setTemplateOpen(true)}
              className="inline-flex cursor-pointer items-center gap-1.5 rounded-full border border-white/25 px-4 py-2 text-xs text-white/80 transition-colors hover:bg-white/10"
            >
              <LayoutTemplate size={14} strokeWidth={1.75} />
              {dict.hub.vaultImportTemplate}
            </button>
            <button
              type="button"
              onClick={() => setPickerOpen(true)}
              className="inline-flex cursor-pointer items-center gap-1.5 rounded-full border border-white/25 bg-white/10 px-4 py-2 text-xs text-white transition-colors hover:bg-white/15"
            >
              <Plus size={14} strokeWidth={1.75} />
              {dict.hub.vaultCreate}
            </button>
          </div>
        </div>

        {status && (
          <p className="mb-4 text-xs text-white/45" role="status">
            {status}
          </p>
        )}

        {!ready ? (
          <div className="space-y-3" aria-hidden>
            <div className="h-28 rounded-2xl bg-white/5" />
            <div className="h-28 rounded-2xl bg-white/5" />
          </div>
        ) : cards.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-white/20 px-5 py-12 text-center">
            <p className="mb-4 text-sm text-white/45">{dict.hub.vaultEmpty}</p>
            <div className="flex flex-wrap items-center justify-center gap-4">
              <button
                type="button"
                onClick={() => setTemplateOpen(true)}
                className="cursor-pointer text-sm text-white/60 transition-colors hover:text-white"
              >
                {dict.hub.vaultImportTemplate} →
              </button>
              <button
                type="button"
                onClick={() => setPickerOpen(true)}
                className="cursor-pointer text-sm text-accent transition-colors hover:text-white"
              >
                {dict.hub.vaultCreate} →
              </button>
            </div>
          </div>
        ) : (
          <ul className="space-y-3">
            {cards.map((card) => {
              const busy = busyId === card.id;
              const previewBody = card.draft.cardBody.trim();
              return (
                <li
                  key={card.id}
                  className="overflow-hidden rounded-2xl border border-white/15 bg-white/[0.05]"
                >
                  <div className="flex flex-col gap-4 p-4 sm:flex-row sm:items-stretch">
                    <div
                      className="relative aspect-[16/9] w-full shrink-0 overflow-hidden rounded-xl border border-white/10 bg-[#05070a] sm:w-44"
                      style={
                        card.draft.backgroundUrl
                          ? {
                              backgroundImage: `linear-gradient(rgba(5,7,10,0.45), rgba(5,7,10,0.55)), url(${card.draft.backgroundUrl})`,
                              backgroundSize: "cover",
                              backgroundPosition: "center",
                            }
                          : undefined
                      }
                    >
                      <div className="absolute inset-0 flex flex-col justify-end p-3">
                        <p className="mb-1 text-[10px] tracking-[0.16em] text-white/40 uppercase">
                          {card.moduleIcon} Knowledge Hub
                        </p>
                        <p className="line-clamp-2 text-sm font-medium text-white">
                          {card.draft.cardTitle || card.name}
                        </p>
                      </div>
                    </div>

                    <div className="flex min-w-0 flex-1 flex-col">
                      <div className="mb-2 flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <h2 className="truncate text-sm font-medium text-white">
                            {card.name || dict.shareCard.newVaultCard}
                          </h2>
                          <p className="mt-1 text-[11px] text-white/35">
                            {dict.hub.vaultUpdated}{" "}
                            {formatUpdatedAt(card.updatedAt, locale)}
                          </p>
                        </div>
                      </div>
                      <p className="mb-4 line-clamp-2 flex-1 text-xs leading-relaxed text-white/45">
                        {previewBody || dict.hub.vaultNoBody}
                      </p>
                      <div className="flex flex-wrap items-center gap-2">
                        <button
                          type="button"
                          onClick={() => openEditor(card.id)}
                          className="inline-flex cursor-pointer items-center gap-1 rounded-full border border-white/20 px-3 py-1.5 text-[11px] text-white/80 transition-colors hover:bg-white/10"
                        >
                          <Pencil size={12} strokeWidth={1.75} />
                          {dict.hub.vaultEdit}
                        </button>
                        <button
                          type="button"
                          disabled={busy}
                          onClick={() => void shareCard(card, "download")}
                          className="inline-flex cursor-pointer items-center gap-1 rounded-full border border-white/20 px-3 py-1.5 text-[11px] text-white/80 transition-colors hover:bg-white/10 disabled:opacity-40"
                        >
                          <Download size={12} strokeWidth={1.75} />
                          {dict.shareCard.download}
                        </button>
                        <button
                          type="button"
                          disabled={busy}
                          onClick={() => void shareCard(card, "copy")}
                          className="inline-flex cursor-pointer items-center gap-1 rounded-full border border-white/20 px-3 py-1.5 text-[11px] text-white/80 transition-colors hover:bg-white/10 disabled:opacity-40"
                        >
                          <Copy size={12} strokeWidth={1.75} />
                          {dict.shareCard.copy}
                        </button>
                        <button
                          type="button"
                          onClick={() => saveCardToLibrary(card)}
                          className="inline-flex cursor-pointer items-center gap-1 rounded-full border border-white/20 px-3 py-1.5 text-[11px] text-white/80 transition-colors hover:bg-white/10"
                        >
                          <BookmarkPlus size={12} strokeWidth={1.75} />
                          {dict.hub.vaultSaveToLibrary}
                        </button>
                        <button
                          type="button"
                          onClick={() => exportTemplate(card)}
                          className="inline-flex cursor-pointer items-center gap-1 rounded-full border border-white/20 px-3 py-1.5 text-[11px] text-white/80 transition-colors hover:bg-white/10"
                        >
                          <FileDown size={12} strokeWidth={1.75} />
                          {dict.hub.vaultExportTemplate}
                        </button>
                        <button
                          type="button"
                          onClick={() => setPendingRemoveId(card.id)}
                          className="inline-flex cursor-pointer items-center gap-1 rounded-full px-2.5 py-1.5 text-[11px] text-white/35 transition-colors hover:bg-white/10 hover:text-white/75"
                          aria-label={dict.hub.vaultRemove}
                          title={dict.hub.vaultRemove}
                        >
                          <Trash2 size={12} strokeWidth={1.75} />
                        </button>
                      </div>
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {pickerDialog}
      {templateDialog}
      {libraryDialog}

      {editingCard && (
        <VaultCardEditor
          locale={locale}
          dict={dict}
          card={editingCard}
          open={editorOpen}
          onOpenChange={(next) => {
            if (!next && openedFromLibrary) {
              returnToLibrary();
              return;
            }
            setEditorOpen(next);
            if (!next) {
              setEditingId(null);
              setOpenedFromLibrary(false);
              refresh();
            }
          }}
          onSaved={() => {
            refresh();
            setStatus(dict.shareCard.saved);
          }}
          backLabel={
            openedFromLibrary ? dict.hub.vaultBackToLibrary : undefined
          }
          onBack={openedFromLibrary ? returnToLibrary : undefined}
        />
      )}

      <ConfirmDialog
        open={pendingRemoveId !== null}
        message={dict.hub.vaultRemoveConfirm}
        confirmLabel={dict.common.confirm}
        cancelLabel={dict.common.cancel}
        onConfirm={confirmRemove}
        onCancel={() => setPendingRemoveId(null)}
      />
      <ConfirmDialog
        open={pendingRemoveLibraryId !== null}
        message={dict.hub.vaultRemoveFromLibraryConfirm}
        confirmLabel={dict.common.confirm}
        cancelLabel={dict.common.cancel}
        onConfirm={confirmRemoveLibrary}
        onCancel={() => setPendingRemoveLibraryId(null)}
      />
    </section>
  );
}
