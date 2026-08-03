"use client";

import { useEffect, useState } from "react";
import type { Locale } from "@/i18n/config";
import type { Dictionary } from "@/i18n/dictionaries/zh";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { EditableModuleField } from "@/components/EditableModuleField";
import { ModuleContentExtraFields } from "@/components/ModuleContentExtraFields";
import { RemovableSlot } from "@/components/RemovableSlot";
import { DragHandle, SortableItem, SortableList } from "@/components/SortableReorder";
import {
  addContactLinkField,
  CONTACT_CORE_SLOTS,
  CONTACT_LINKS_EVENT,
  contactFieldLabelKey,
  contactFieldValueKey,
  contactLabelKey,
  contactValueHref,
  contactValueKey,
  createContactLink,
  DEFAULT_CONTACT_LINKS,
  loadContactLinks,
  removeContactLink,
  removeContactLinkField,
  reorderContactLinkFields,
  reorderContactLinks,
  setContactLinkCoreSlots,
  type ContactCoreSlot,
  type ContactLinkDef,
} from "@/lib/contact-links";
import {
  removeCoreSlot,
  restoreCoreSlotOrAddCustom,
} from "@/lib/core-slots";
import {
  ensureCrossLocaleModuleContent,
  MODULE_CONTENT_EVENT,
  resolveModuleContent,
  saveModuleContent,
} from "@/lib/module-content";
import { trashContactExtraField, trashCoreSlot } from "@/lib/field-trash";

const VALUE_DEFAULTS: Record<"email" | "github", string> = {
  email: "hello@example.com",
  github: "github.com/yourname",
};

interface ContactEditableBodyProps {
  locale: Locale;
  dict: Dictionary;
  hideAdd?: boolean;
}

export function ContactEditableBody({
  locale,
  dict,
  hideAdd = false,
}: ContactEditableBodyProps) {
  const [links, setLinks] = useState<ContactLinkDef[]>(DEFAULT_CONTACT_LINKS);
  /** Live values for clickable mailto / URL on contact cards (no type icons). */
  const [values, setValues] = useState<Record<string, string>>({});
  const [ready, setReady] = useState(false);
  const [pendingRemoveId, setPendingRemoveId] = useState<string | null>(null);
  const [pendingRemoveCore, setPendingRemoveCore] = useState<{
    linkId: string;
    slot: ContactCoreSlot;
  } | null>(null);

  function labelDefault(link: ContactLinkDef) {
    if (link.kind === "email") return dict.contact.email;
    if (link.kind === "github") return dict.contact.github;
    return dict.contact.newLinkLabel;
  }

  function valueDefault(link: ContactLinkDef) {
    if (link.kind === "email") return VALUE_DEFAULTS.email;
    if (link.kind === "github") return VALUE_DEFAULTS.github;
    return dict.contact.newLinkValue;
  }

  useEffect(() => {
    let cancelled = false;

    async function refresh() {
      await ensureCrossLocaleModuleContent();
      if (cancelled) return;
      const nextLinks = loadContactLinks();
      const nextValues: Record<string, string> = {};
      for (const link of nextLinks) {
        const key = contactValueKey(link.id, link.kind);
        nextValues[key] = resolveModuleContent(
          locale,
          key,
          valueDefault(link),
        );
      }
      setLinks(nextLinks);
      setValues(nextValues);
      setReady(true);
    }

    void refresh();

    function onUpdate(event: Event) {
      const detail = (event as CustomEvent<{ locale?: Locale }>).detail;
      if (detail?.locale && detail.locale !== locale) return;
      void refresh();
    }

    window.addEventListener(CONTACT_LINKS_EVENT, onUpdate);
    window.addEventListener(MODULE_CONTENT_EVENT, onUpdate);
    window.addEventListener("storage", onUpdate);
    return () => {
      cancelled = true;
      window.removeEventListener(CONTACT_LINKS_EVENT, onUpdate);
      window.removeEventListener(MODULE_CONTENT_EVENT, onUpdate);
      window.removeEventListener("storage", onUpdate);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [locale]);

  async function handleAdd() {
    const { links: next, id } = createContactLink(links);
    await saveModuleContent(
      locale,
      contactLabelKey(id, "custom")!,
      dict.contact.newLinkLabel,
    );
    await saveModuleContent(
      locale,
      contactValueKey(id, "custom"),
      dict.contact.newLinkValue,
    );
    setLinks(next);
  }

  function confirmRemove() {
    if (!pendingRemoveId) return;
    // Keep at least one contact card.
    if (links.length <= 1) {
      setPendingRemoveId(null);
      return;
    }
    setLinks(removeContactLink(links, pendingRemoveId));
    setPendingRemoveId(null);
  }

  function handleReorder(from: number, to: number) {
    setLinks(reorderContactLinks(links, from, to));
  }

  async function addCustomField(linkId: string) {
    const result = addContactLinkField(links, linkId);
    if (!result) return;
    await saveModuleContent(
      locale,
      contactFieldLabelKey(linkId, result.fieldId),
      dict.common.newFieldLabel,
    );
    await saveModuleContent(
      locale,
      contactFieldValueKey(linkId, result.fieldId),
      dict.common.newFieldValue,
    );
    setLinks(result.links);
  }

  async function handleAddField(linkId: string) {
    const link = links.find((item) => item.id === linkId);
    if (!link) return;
    const core = link.coreSlots ?? [...CONTACT_CORE_SLOTS];
    const restored = restoreCoreSlotOrAddCustom(core, CONTACT_CORE_SLOTS, () => {
      void addCustomField(linkId);
    });
    if (restored) {
      setLinks(setContactLinkCoreSlots(links, linkId, restored));
    }
  }

  function handleRemoveField(linkId: string, fieldId: string) {
    trashContactExtraField(linkId, fieldId);
    setLinks(removeContactLinkField(links, linkId, fieldId));
  }

  function confirmRemoveCore() {
    if (!pendingRemoveCore) return;
    const link = links.find((item) => item.id === pendingRemoveCore.linkId);
    if (!link) {
      setPendingRemoveCore(null);
      return;
    }
    trashCoreSlot(
      { scope: "contact", linkId: pendingRemoveCore.linkId },
      pendingRemoveCore.slot,
      pendingRemoveCore.slot,
    );
    const next = removeCoreSlot(
      link.coreSlots ?? [...CONTACT_CORE_SLOTS],
      pendingRemoveCore.slot,
    );
    setLinks(
      setContactLinkCoreSlots(links, pendingRemoveCore.linkId, next),
    );
    setPendingRemoveCore(null);
  }

  if (!ready) {
    return (
      <div className="space-y-8" aria-hidden>
        <div className="h-16 max-w-xl rounded-lg bg-white/[0.03]" />
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="h-28 rounded-xl border border-white/10 bg-white/[0.03]" />
          <div className="h-28 rounded-xl border border-white/10 bg-white/[0.03]" />
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="space-y-4">
        <SortableList count={links.length} onReorder={handleReorder}>
          <div className="grid gap-4 sm:grid-cols-2">
            {links.map((link, index) => {
              const valueKey = contactValueKey(link.id, link.kind);
              const labelKey = contactLabelKey(link.id, link.kind);
              const liveValue = values[valueKey] ?? valueDefault(link);
              const href = contactValueHref(link.kind, liveValue);
              const canRemove = links.length > 1;
              const core = link.coreSlots ?? [...CONTACT_CORE_SLOTS];

              return (
                <SortableItem
                  key={link.id}
                  index={index}
                  className="group/item rounded-xl border border-white/10 bg-white/[0.03] p-5 transition-colors hover:border-white/20"
                >
                  <div className="min-w-0">
                    <div className="mb-2 flex items-center justify-end gap-0.5">
                      <DragHandle index={index} label={dict.common.reorder} />
                      {canRemove && (
                        <button
                          type="button"
                          onClick={() => setPendingRemoveId(link.id)}
                          className="cursor-pointer rounded px-1.5 text-sm text-white/35 transition-colors hover:bg-white/10 hover:text-white/75"
                          aria-label={dict.contact.removeLink}
                          title={dict.contact.removeLink}
                        >
                          ×
                        </button>
                      )}
                    </div>
                    <div className="space-y-2">
                      {core.includes("label") && (
                        <RemovableSlot
                          removeLabel={dict.common.removeField}
                          onRemove={() =>
                            setPendingRemoveCore({
                              linkId: link.id,
                              slot: "label",
                            })
                          }
                        >
                          {labelKey ? (
                            <EditableModuleField
                              locale={locale}
                              fieldKey={labelKey}
                              defaultText={labelDefault(link)}
                              editHint={dict.home.noteEdit}
                              placeholder={dict.contact.labelPlaceholder}
                              saveHint={dict.home.noteSaveHint}
                              rows={1}
                              commitOnEnter
                              muted
                              textClassName="text-xs"
                            />
                          ) : (
                            <p className="text-xs text-muted">
                              {labelDefault(link)}
                            </p>
                          )}
                        </RemovableSlot>
                      )}
                      {core.includes("value") && (
                        <RemovableSlot
                          removeLabel={dict.common.removeField}
                          onRemove={() =>
                            setPendingRemoveCore({
                              linkId: link.id,
                              slot: "value",
                            })
                          }
                        >
                          <EditableModuleField
                            locale={locale}
                            fieldKey={valueKey}
                            defaultText={valueDefault(link)}
                            editHint={dict.home.noteEdit}
                            placeholder={dict.contact.valuePlaceholder}
                            saveHint={dict.home.pageSaveHint}
                            rows={2}
                            commitOnEnter
                            muted={false}
                            href={href}
                          />
                        </RemovableSlot>
                      )}
                    </div>
                    <ModuleContentExtraFields
                      locale={locale}
                      dict={dict}
                      fields={link.fields ?? []}
                      labelKey={(fieldId) =>
                        contactFieldLabelKey(link.id, fieldId)
                      }
                      valueKey={(fieldId) =>
                        contactFieldValueKey(link.id, fieldId)
                      }
                      onAdd={() => void handleAddField(link.id)}
                      onRemove={(fieldId) =>
                        handleRemoveField(link.id, fieldId)
                      }
                      onReorder={(from, to) =>
                        setLinks(
                          reorderContactLinkFields(links, link.id, from, to),
                        )
                      }
                    />
                  </div>
                </SortableItem>
              );
            })}
          </div>
        </SortableList>

        {!hideAdd && (
          <button
            type="button"
            onClick={() => void handleAdd()}
            className="w-full cursor-pointer rounded-xl border border-dashed border-white/20 px-4 py-3 text-left text-sm text-white/45 transition-colors hover:border-white/35 hover:text-white/80"
          >
            <span className="mr-2 text-base text-white/50">+</span>
            {dict.contact.addLink}
          </button>
        )}
      </div>

      <ConfirmDialog
        open={pendingRemoveId !== null}
        message={dict.contact.removeLinkConfirm}
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
    </>
  );
}
