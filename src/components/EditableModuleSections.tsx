"use client";

import { useEffect, useState } from "react";
import type { Locale } from "@/i18n/config";
import type { Dictionary } from "@/i18n/dictionaries/zh";
import type { ModuleId } from "@/lib/modules";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { EditableModuleField } from "@/components/EditableModuleField";
import { ModuleContentExtraFields } from "@/components/ModuleContentExtraFields";
import { RemovableSlot } from "@/components/RemovableSlot";
import { DragHandle, SortableItem, SortableList } from "@/components/SortableReorder";
import {
  removeCoreSlot,
  restoreCoreSlotOrAddCustom,
} from "@/lib/core-slots";
import { saveModuleContent } from "@/lib/module-content";
import {
  addModuleSectionField,
  createModuleSection,
  loadModuleSections,
  MODULE_SECTIONS_EVENT,
  removeModuleSection,
  removeModuleSectionField,
  reorderModuleSections,
  SECTION_CORE_SLOTS,
  sectionBodyKey,
  sectionFieldLabelKey,
  sectionFieldValueKey,
  sectionTitleKey,
  setModuleSectionCoreSlots,
  type ModuleSectionDefault,
  type ModuleSectionDef,
  type SectionCoreSlot,
  type SectionVariant,
} from "@/lib/module-sections";

interface EditableModuleSectionsProps {
  locale: Locale;
  dict: Dictionary;
  moduleId: ModuleId | string;
  accentColor?: string;
  defaults: ModuleSectionDefault[];
  /** Hide local add control when a shared ModuleAddMenu is used. */
  hideAdd?: boolean;
}

export function EditableModuleSections({
  locale,
  dict,
  moduleId,
  accentColor = "#b7c4ce",
  defaults,
  hideAdd = false,
}: EditableModuleSectionsProps) {
  const defaultLayout = defaults.map(
    ({ id, variant, fields, coreSlots }) => ({
      id,
      variant,
      fields: fields ?? [],
      coreSlots: coreSlots ?? [...SECTION_CORE_SLOTS],
    }),
  );
  const defaultsById = Object.fromEntries(
    defaults.map((item) => [item.id, item]),
  ) as Record<string, ModuleSectionDefault>;

  const [sections, setSections] = useState<ModuleSectionDef[]>(defaultLayout);
  const [ready, setReady] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [pendingRemoveId, setPendingRemoveId] = useState<string | null>(null);
  const [pendingRemoveCore, setPendingRemoveCore] = useState<{
    sectionId: string;
    slot: SectionCoreSlot;
  } | null>(null);

  useEffect(() => {
    function refresh() {
      setSections(loadModuleSections(moduleId, defaultLayout));
      setReady(true);
    }
    refresh();
    function onUpdate(event: Event) {
      const detail = (event as CustomEvent<{ moduleId?: string }>).detail;
      if (detail?.moduleId && detail.moduleId !== moduleId) return;
      refresh();
    }
    window.addEventListener(MODULE_SECTIONS_EVENT, onUpdate);
    window.addEventListener("storage", onUpdate);
    return () => {
      window.removeEventListener(MODULE_SECTIONS_EVENT, onUpdate);
      window.removeEventListener("storage", onUpdate);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [moduleId]);

  async function handleAdd(variant: SectionVariant) {
    const { sections: next, id } = createModuleSection(
      moduleId,
      sections,
      variant,
    );
    await saveModuleContent(
      locale,
      sectionTitleKey(moduleId, id),
      dict.home.newSectionTitle,
    );
    await saveModuleContent(
      locale,
      sectionBodyKey(moduleId, id),
      dict.home.newSectionBody,
    );
    setSections(next);
    setPickerOpen(false);
  }

  function requestRemove(sectionId: string) {
    if (sections.length <= 0) return;
    setPendingRemoveId(sectionId);
  }

  function confirmRemove() {
    if (!pendingRemoveId) return;
    setSections(removeModuleSection(moduleId, sections, pendingRemoveId));
    setPendingRemoveId(null);
  }

  function handleReorder(from: number, to: number) {
    setSections(reorderModuleSections(moduleId, sections, from, to));
  }

  async function addCustomField(sectionId: string) {
    const result = addModuleSectionField(moduleId, sections, sectionId);
    if (!result) return;
    await saveModuleContent(
      locale,
      sectionFieldLabelKey(moduleId, sectionId, result.fieldId),
      dict.common.newFieldLabel,
    );
    await saveModuleContent(
      locale,
      sectionFieldValueKey(moduleId, sectionId, result.fieldId),
      dict.common.newFieldValue,
    );
    setSections(result.sections);
  }

  async function handleAddField(sectionId: string) {
    const section = sections.find((item) => item.id === sectionId);
    if (!section) return;
    const core = section.coreSlots ?? [...SECTION_CORE_SLOTS];
    const restored = restoreCoreSlotOrAddCustom(
      core,
      SECTION_CORE_SLOTS,
      () => {
        void addCustomField(sectionId);
      },
    );
    if (restored) {
      setSections(
        setModuleSectionCoreSlots(moduleId, sections, sectionId, restored),
      );
    }
  }

  function handleRemoveField(sectionId: string, fieldId: string) {
    setSections(
      removeModuleSectionField(moduleId, sections, sectionId, fieldId),
    );
  }

  function confirmRemoveCore() {
    if (!pendingRemoveCore) return;
    const section = sections.find(
      (item) => item.id === pendingRemoveCore.sectionId,
    );
    if (!section) {
      setPendingRemoveCore(null);
      return;
    }
    const next = removeCoreSlot(
      section.coreSlots ?? [...SECTION_CORE_SLOTS],
      pendingRemoveCore.slot,
    );
    setSections(
      setModuleSectionCoreSlots(
        moduleId,
        sections,
        pendingRemoveCore.sectionId,
        next,
      ),
    );
    setPendingRemoveCore(null);
  }

  if (!ready) {
    return (
      <div className="space-y-8" aria-hidden>
        <div className="h-24 rounded-xl border border-white/10 bg-white/[0.02]" />
        <div className="h-24 rounded-xl border border-white/10 bg-white/[0.02]" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <SortableList count={sections.length} onReorder={handleReorder}>
        <div className="space-y-8">
          {sections.map((section, index) => {
            const fallback = defaultsById[section.id];
            const titleDefault =
              fallback?.title ?? dict.home.newSectionTitle;
            const bodyDefault = fallback?.body ?? dict.home.newSectionBody;
            const placeholder =
              section.variant === "list"
                ? dict.home.listPlaceholder
                : section.variant === "chips"
                  ? dict.home.chipsPlaceholder
                  : dict.home.pagePlaceholder;
            const core = section.coreSlots ?? [...SECTION_CORE_SLOTS];

            return (
              <SortableItem
                key={section.id}
                index={index}
                className="group/item relative"
              >
                <section>
                  <div className="mb-3 flex items-center justify-end gap-0.5">
                    <DragHandle index={index} label={dict.common.reorder} />
                    <button
                      type="button"
                      onClick={() => requestRemove(section.id)}
                      className="cursor-pointer rounded px-1.5 text-sm text-white/35 transition-colors hover:bg-white/10 hover:text-white/75"
                      aria-label={dict.home.removeSection}
                      title={dict.home.removeSection}
                    >
                      ×
                    </button>
                  </div>

                  <div className="space-y-2">
                    {core.includes("title") && (
                      <RemovableSlot
                        removeLabel={dict.common.removeField}
                        onRemove={() =>
                          setPendingRemoveCore({
                            sectionId: section.id,
                            slot: "title",
                          })
                        }
                      >
                        <div style={{ color: accentColor }}>
                          <EditableModuleField
                            locale={locale}
                            fieldKey={sectionTitleKey(moduleId, section.id)}
                            defaultText={titleDefault}
                            editHint={dict.home.noteEdit}
                            placeholder={dict.home.titlePlaceholder}
                            saveHint={dict.home.noteSaveHint}
                            rows={1}
                            commitOnEnter
                            muted={false}
                            inheritColor
                            textClassName="font-mono text-sm"
                            accentColor={accentColor}
                          />
                        </div>
                      </RemovableSlot>
                    )}

                    {core.includes("body") && (
                      <RemovableSlot
                        removeLabel={dict.common.removeField}
                        onRemove={() =>
                          setPendingRemoveCore({
                            sectionId: section.id,
                            slot: "body",
                          })
                        }
                      >
                        <EditableModuleField
                          locale={locale}
                          fieldKey={sectionBodyKey(moduleId, section.id)}
                          defaultText={bodyDefault}
                          editHint={dict.home.noteEdit}
                          placeholder={placeholder}
                          saveHint={dict.home.pageSaveHint}
                          rows={section.variant === "plain" ? 4 : 3}
                          variant={section.variant}
                          accentColor={accentColor}
                          muted={false}
                        />
                      </RemovableSlot>
                    )}
                  </div>

                  <ModuleContentExtraFields
                    locale={locale}
                    dict={dict}
                    fields={section.fields ?? []}
                    labelKey={(fieldId) =>
                      sectionFieldLabelKey(moduleId, section.id, fieldId)
                    }
                    valueKey={(fieldId) =>
                      sectionFieldValueKey(moduleId, section.id, fieldId)
                    }
                    onAdd={() => void handleAddField(section.id)}
                    onRemove={(fieldId) =>
                      handleRemoveField(section.id, fieldId)
                    }
                    accentColor={accentColor}
                  />
                </section>
              </SortableItem>
            );
          })}
        </div>
      </SortableList>

      {!hideAdd && (
        <div className="rounded-xl border border-dashed border-white/20 px-4 py-3">
          {!pickerOpen ? (
            <button
              type="button"
              onClick={() => setPickerOpen(true)}
              className="cursor-pointer text-sm text-white/45 transition-colors hover:text-white/80"
            >
              <span className="mr-2 text-base text-white/50">+</span>
              {dict.home.addSection}
            </button>
          ) : (
            <div className="space-y-2">
              <div className="flex items-center justify-between gap-2">
                <p className="text-xs text-white/40">{dict.home.addSectionHint}</p>
                <button
                  type="button"
                  onClick={() => setPickerOpen(false)}
                  className="cursor-pointer text-xs text-white/35 hover:text-white/70"
                >
                  {dict.home.cancelAdd}
                </button>
              </div>
              <div className="flex flex-wrap gap-2">
                {(
                  [
                    ["plain", dict.home.sectionVariantPlain],
                    ["list", dict.home.sectionVariantList],
                    ["chips", dict.home.sectionVariantChips],
                  ] as const
                ).map(([variant, label]) => (
                  <button
                    key={variant}
                    type="button"
                    onClick={() => void handleAdd(variant)}
                    className="cursor-pointer rounded-lg border border-white/15 bg-white/5 px-3 py-1.5 text-xs text-white/75 transition-colors hover:border-white/30 hover:bg-white/10 hover:text-white"
                  >
                    + {label}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      <ConfirmDialog
        open={pendingRemoveId !== null}
        message={dict.home.removeSectionConfirm}
        confirmLabel={dict.common.confirm}
        cancelLabel={dict.common.cancel}
        onConfirm={confirmRemove}
        onCancel={() => setPendingRemoveId(null)}
      />
      <ConfirmDialog
        open={pendingRemoveCore !== null}
        message={dict.common.removeFieldConfirm}
        confirmLabel={dict.common.confirm}
        cancelLabel={dict.common.cancel}
        onConfirm={confirmRemoveCore}
        onCancel={() => setPendingRemoveCore(null)}
      />
    </div>
  );
}
