import {
  purgeContactLinkContentKeys,
  restoreContactLink,
} from "./contact-links";
import { isBuiltinModuleId } from "./modules";
import { purgeModuleContent } from "./module-content";
import {
  purgeModuleSectionContent,
  restoreModuleSection,
} from "./module-sections";
import { restorePostItem } from "./post-edits";
import { restoreProjectItem } from "./project-edits";
import { restoreRoadmapItem } from "./roadmap-edits";
import { purgeTocNotesForModule } from "./toc-notes";
import {
  clearTrash,
  getTrashItems,
  removeTrashItem,
  type TrashItem,
} from "./trash";

/** Restore a non-module trash entry into its source store. */
export function restoreTrashContent(item: TrashItem): boolean {
  switch (item.kind) {
    case "section":
      return restoreModuleSection(item.moduleId, item.section, item.texts);
    case "project":
      return restoreProjectItem(item.moduleId, item.snapshot);
    case "post":
      return restorePostItem(item.collection, item.snapshot);
    case "roadmap":
      return restoreRoadmapItem(item.moduleId, item.snapshot);
    case "contact":
      return restoreContactLink(item.link, item.texts);
    case "module":
      return false;
    default:
      return false;
  }
}

export function permanentlyPurgeTrashItem(item: TrashItem) {
  switch (item.kind) {
    case "module":
      if (!isBuiltinModuleId(item.moduleId)) {
        purgeModuleContent(item.moduleId);
        purgeTocNotesForModule(item.moduleId);
      }
      break;
    case "section":
      purgeModuleSectionContent(
        item.moduleId,
        item.section.id,
        item.section.fields ?? [],
      );
      break;
    case "contact":
      purgeContactLinkContentKeys(item.link);
      break;
    case "project":
    case "post":
    case "roadmap":
      break;
    default:
      break;
  }
}

export function permanentlyDeleteTrashEntry(trashId: string) {
  const item = getTrashItems().find((entry) => entry.id === trashId);
  if (!item) return;
  permanentlyPurgeTrashItem(item);
  removeTrashItem(trashId, {
    dismissBuiltin: item.kind === "module" && isBuiltinModuleId(item.moduleId),
  });
}

export function emptyAllTrashPermanently() {
  for (const item of getTrashItems()) {
    permanentlyPurgeTrashItem(item);
  }
  clearTrash({ dismissRemainingBuiltins: true });
}
