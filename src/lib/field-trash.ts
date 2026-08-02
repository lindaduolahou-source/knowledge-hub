import type { Locale } from "@/i18n/config";
import { locales } from "@/i18n/config";
import {
  contactFieldLabelKey,
  contactFieldValueKey,
  loadContactLinks,
  saveContactLinks,
  setContactLinkCoreSlots,
  type ContactCoreSlot,
} from "./contact-links";
import { resolveModuleContent, setModuleContentLocal } from "./module-content";
import {
  loadModuleSections,
  saveModuleSections,
  sectionFieldLabelKey,
  sectionFieldValueKey,
  setModuleSectionCoreSlots,
  type SectionCoreSlot,
} from "./module-sections";
import type { ExtraField } from "./extra-fields";
import {
  loadPostItems,
  updatePostItem,
  type PostCollection,
  type PostCoreSlot,
} from "./post-edits";
import {
  loadProjectItems,
  updateProjectItem,
  type ProjectCoreSlot,
} from "./project-edits";
import {
  loadRoadmapItems,
  updateRoadmapItem,
  type RoadmapCoreSlot,
} from "./roadmap-edits";
import {
  pushFieldToTrash,
  type FieldParent,
  type TrashFieldItem,
  type TrashFieldPayload,
} from "./trash";

function titleForExtra(field: ExtraField) {
  return field.label.trim() || field.value.trim().slice(0, 24) || field.id;
}

export function trashExtraField(
  parent: FieldParent,
  field: ExtraField,
): TrashFieldItem {
  return pushFieldToTrash({
    title: titleForExtra(field),
    parent,
    payload: { type: "extra", field: { ...field } },
  });
}

export function trashCoreSlot(
  parent: FieldParent,
  slot: string,
  title?: string,
): TrashFieldItem {
  return pushFieldToTrash({
    title: title?.trim() || slot,
    parent,
    payload: { type: "core", slot },
  });
}

export function trashSectionExtraField(
  moduleId: string,
  sectionId: string,
  fieldId: string,
): TrashFieldItem {
  const texts: Partial<Record<Locale, { label: string; value: string }>> = {};
  for (const locale of locales) {
    texts[locale] = {
      label: resolveModuleContent(
        locale,
        sectionFieldLabelKey(moduleId, sectionId, fieldId),
        "",
      ),
      value: resolveModuleContent(
        locale,
        sectionFieldValueKey(moduleId, sectionId, fieldId),
        "",
      ),
    };
  }
  const title =
    texts.zh?.label.trim() ||
    texts.en?.label.trim() ||
    texts.zh?.value.trim() ||
    fieldId;
  return pushFieldToTrash({
    title,
    parent: { scope: "section", moduleId, sectionId },
    payload: { type: "section-field", fieldId, texts },
  });
}

export function trashContactExtraField(
  linkId: string,
  fieldId: string,
): TrashFieldItem {
  const texts: Partial<Record<Locale, { label: string; value: string }>> = {};
  for (const locale of locales) {
    texts[locale] = {
      label: resolveModuleContent(
        locale,
        contactFieldLabelKey(linkId, fieldId),
        "",
      ),
      value: resolveModuleContent(
        locale,
        contactFieldValueKey(linkId, fieldId),
        "",
      ),
    };
  }
  const title =
    texts.zh?.label.trim() ||
    texts.en?.label.trim() ||
    texts.zh?.value.trim() ||
    fieldId;
  return pushFieldToTrash({
    title,
    parent: { scope: "contact", linkId },
    payload: { type: "contact-field", fieldId, texts },
  });
}

function restoreExtraOnProject(
  moduleId: string,
  slug: string,
  field: ExtraField,
): boolean {
  let found = false;
  for (const locale of locales) {
    const items = loadProjectItems(moduleId, locale, []);
    const item = items.find((row) => row.slug === slug);
    if (!item) continue;
    found = true;
    if (item.fields.some((row) => row.id === field.id)) continue;
    updateProjectItem(moduleId, locale, items, slug, {
      fields: [...item.fields, { ...field }],
    });
  }
  return found;
}

function restoreCoreOnProject(
  moduleId: string,
  slug: string,
  slot: string,
): boolean {
  let found = false;
  for (const locale of locales) {
    const items = loadProjectItems(moduleId, locale, []);
    const item = items.find((row) => row.slug === slug);
    if (!item) continue;
    found = true;
    const core = item.coreSlots ?? [];
    if (core.includes(slot as ProjectCoreSlot)) continue;
    updateProjectItem(moduleId, locale, items, slug, {
      coreSlots: [...core, slot as ProjectCoreSlot],
    });
  }
  return found;
}

function restoreExtraOnPost(
  collection: PostCollection,
  slug: string,
  field: ExtraField,
): boolean {
  let found = false;
  for (const locale of locales) {
    const items = loadPostItems(collection, locale, []);
    const item = items.find((row) => row.slug === slug);
    if (!item) continue;
    found = true;
    if (item.fields.some((row) => row.id === field.id)) continue;
    updatePostItem(collection, locale, items, slug, {
      fields: [...item.fields, { ...field }],
    });
  }
  return found;
}

function restoreCoreOnPost(
  collection: PostCollection,
  slug: string,
  slot: string,
): boolean {
  let found = false;
  for (const locale of locales) {
    const items = loadPostItems(collection, locale, []);
    const item = items.find((row) => row.slug === slug);
    if (!item) continue;
    found = true;
    const core = item.coreSlots ?? [];
    if (core.includes(slot as PostCoreSlot)) continue;
    updatePostItem(collection, locale, items, slug, {
      coreSlots: [...core, slot as PostCoreSlot],
    });
  }
  return found;
}

function restoreExtraOnRoadmap(
  moduleId: string,
  stageId: string,
  field: ExtraField,
): boolean {
  let found = false;
  for (const locale of locales) {
    const items = loadRoadmapItems(moduleId, locale, []);
    const item = items.find((row) => row.id === stageId);
    if (!item) continue;
    found = true;
    const fields = item.fields ?? [];
    if (fields.some((row) => row.id === field.id)) continue;
    updateRoadmapItem(moduleId, locale, items, stageId, {
      fields: [...fields, { ...field }],
    });
  }
  return found;
}

function restoreCoreOnRoadmap(
  moduleId: string,
  stageId: string,
  slot: string,
): boolean {
  let found = false;
  for (const locale of locales) {
    const items = loadRoadmapItems(moduleId, locale, []);
    const item = items.find((row) => row.id === stageId);
    if (!item) continue;
    found = true;
    const core = item.coreSlots ?? [];
    if (core.includes(slot as RoadmapCoreSlot)) continue;
    updateRoadmapItem(moduleId, locale, items, stageId, {
      coreSlots: [...core, slot as RoadmapCoreSlot],
    });
  }
  return found;
}

function restoreSectionField(
  moduleId: string,
  sectionId: string,
  payload: Extract<TrashFieldPayload, { type: "section-field" }>,
): boolean {
  const sections = loadModuleSections(moduleId, []);
  const section = sections.find((item) => item.id === sectionId);
  if (!section) return false;
  if (!(section.fields ?? []).some((field) => field.id === payload.fieldId)) {
    saveModuleSections(
      moduleId,
      sections.map((item) =>
        item.id === sectionId
          ? {
              ...item,
              fields: [...(item.fields ?? []), { id: payload.fieldId }],
            }
          : item,
      ),
    );
  }
  for (const locale of locales) {
    const text = payload.texts[locale];
    if (!text) continue;
    setModuleContentLocal(
      locale,
      sectionFieldLabelKey(moduleId, sectionId, payload.fieldId),
      text.label,
    );
    setModuleContentLocal(
      locale,
      sectionFieldValueKey(moduleId, sectionId, payload.fieldId),
      text.value,
    );
  }
  return true;
}

function restoreSectionCore(
  moduleId: string,
  sectionId: string,
  slot: string,
): boolean {
  const sections = loadModuleSections(moduleId, []);
  const section = sections.find((item) => item.id === sectionId);
  if (!section) return false;
  const core = section.coreSlots ?? [];
  if (core.includes(slot as SectionCoreSlot)) return true;
  setModuleSectionCoreSlots(moduleId, sections, sectionId, [
    ...core,
    slot as SectionCoreSlot,
  ]);
  return true;
}

function restoreContactField(
  linkId: string,
  payload: Extract<TrashFieldPayload, { type: "contact-field" }>,
): boolean {
  const links = loadContactLinks();
  const link = links.find((item) => item.id === linkId);
  if (!link) return false;
  if (!(link.fields ?? []).some((field) => field.id === payload.fieldId)) {
    saveContactLinks(
      links.map((item) =>
        item.id === linkId
          ? {
              ...item,
              fields: [...(item.fields ?? []), { id: payload.fieldId }],
            }
          : item,
      ),
    );
  }
  for (const locale of locales) {
    const text = payload.texts[locale];
    if (!text) continue;
    setModuleContentLocal(
      locale,
      contactFieldLabelKey(linkId, payload.fieldId),
      text.label,
    );
    setModuleContentLocal(
      locale,
      contactFieldValueKey(linkId, payload.fieldId),
      text.value,
    );
  }
  return true;
}

function restoreContactCore(linkId: string, slot: string): boolean {
  const links = loadContactLinks();
  const link = links.find((item) => item.id === linkId);
  if (!link) return false;
  const core = link.coreSlots ?? [];
  if (core.includes(slot as ContactCoreSlot)) return true;
  setContactLinkCoreSlots(links, linkId, [...core, slot as ContactCoreSlot]);
  return true;
}

/** Restore a field/栏目 trash entry into its parent. */
export function restoreFieldTrashItem(item: TrashFieldItem): boolean {
  const { parent, payload } = item;
  switch (parent.scope) {
    case "project":
      if (payload.type === "extra") {
        return restoreExtraOnProject(parent.moduleId, parent.slug, payload.field);
      }
      if (payload.type === "core") {
        return restoreCoreOnProject(parent.moduleId, parent.slug, payload.slot);
      }
      return false;
    case "post":
      if (payload.type === "extra") {
        return restoreExtraOnPost(parent.collection, parent.slug, payload.field);
      }
      if (payload.type === "core") {
        return restoreCoreOnPost(parent.collection, parent.slug, payload.slot);
      }
      return false;
    case "roadmap":
      if (payload.type === "extra") {
        return restoreExtraOnRoadmap(
          parent.moduleId,
          parent.stageId,
          payload.field,
        );
      }
      if (payload.type === "core") {
        return restoreCoreOnRoadmap(
          parent.moduleId,
          parent.stageId,
          payload.slot,
        );
      }
      return false;
    case "section":
      if (payload.type === "section-field") {
        return restoreSectionField(parent.moduleId, parent.sectionId, payload);
      }
      if (payload.type === "core") {
        return restoreSectionCore(
          parent.moduleId,
          parent.sectionId,
          payload.slot,
        );
      }
      return false;
    case "contact":
      if (payload.type === "contact-field") {
        return restoreContactField(parent.linkId, payload);
      }
      if (payload.type === "core") {
        return restoreContactCore(parent.linkId, payload.slot);
      }
      return false;
    default:
      return false;
  }
}
