import type { ModuleId } from "./modules";
import { createSyncedTextStore } from "./personal-store";
import { getPublishedText } from "./published-site";

export const MODULE_CONTENT_EVENT = "knowledge-hub:module-content-updated";

/** Field keys for editable module page content (builtin + custom). */
export type ModuleContentKey = string;

export function moduleTitleKey(id: ModuleId): ModuleContentKey {
  return `${id}:title`;
}

export function moduleIntroKey(id: ModuleId): ModuleContentKey {
  return `${id}:intro`;
}

const store = createSyncedTextStore({
  prefix: "knowledge-hub:module-content",
  eventName: MODULE_CONTENT_EVENT,
  getPublished: (locale, key) =>
    getPublishedText("moduleContent", locale, key),
});

export const resolveModuleContent = store.resolve;
export const saveModuleContent = store.save;
export const ensureCrossLocaleModuleContent = store.ensureCrossLocale;

export function purgeModuleContent(moduleId: ModuleId) {
  store.removeKeysMatching(
    (key) => key === moduleId || key.startsWith(`${moduleId}:`),
  );
}
