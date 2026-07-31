import type { Locale } from "@/i18n/config";
import type { ModuleSectionDef } from "@/lib/module-sections";
import publishedSeed from "../../content/published-site.json";

export type PublishedLocaleMap = Record<string, string>;

export type PublishedModuleLayout = {
  activeIds: string[];
  custom: Record<string, { icon: string }>;
};

export type PublishedSite = {
  version: number;
  exportedAt?: string | null;
  moduleContent: {
    zh: PublishedLocaleMap;
    en: PublishedLocaleMap;
  };
  tocNotes: {
    zh: PublishedLocaleMap;
    en: PublishedLocaleMap;
  };
  moduleLayout: PublishedModuleLayout | null;
  moduleSections: Record<string, ModuleSectionDef[]> | null;
};

const published = publishedSeed as PublishedSite;

function localeMap(
  bucket: "moduleContent" | "tocNotes",
  locale: Locale,
): PublishedLocaleMap {
  const map = published[bucket]?.[locale];
  return map && typeof map === "object" ? map : {};
}

export function getPublishedText(
  bucket: "moduleContent" | "tocNotes",
  locale: Locale,
  key: string,
): string | undefined {
  const map = localeMap(bucket, locale);
  if (!Object.prototype.hasOwnProperty.call(map, key)) return undefined;
  return map[key] ?? "";
}

export function getPublishedModuleLayout(): PublishedModuleLayout | null {
  const layout = published.moduleLayout;
  if (!layout || typeof layout !== "object") return null;
  if (!Array.isArray(layout.activeIds)) return null;
  return {
    activeIds: layout.activeIds.filter(
      (id): id is string => typeof id === "string",
    ),
    custom:
      layout.custom && typeof layout.custom === "object" ? layout.custom : {},
  };
}

export function getPublishedModuleSections(
  moduleId: string,
): ModuleSectionDef[] | null {
  const all = published.moduleSections;
  if (!all || typeof all !== "object") return null;
  const sections = all[moduleId];
  if (!Array.isArray(sections)) return null;
  return sections
    .filter(
      (item): item is ModuleSectionDef =>
        Boolean(item) &&
        typeof item.id === "string" &&
        (item.variant === "plain" ||
          item.variant === "list" ||
          item.variant === "chips"),
    )
    .map((item) => ({
      id: item.id,
      variant: item.variant,
      fields: Array.isArray(item.fields)
        ? item.fields
            .filter(
              (field): field is { id: string } =>
                Boolean(field) &&
                typeof field === "object" &&
                typeof (field as { id?: unknown }).id === "string",
            )
            .map((field) => ({ id: field.id }))
        : [],
      coreSlots: Array.isArray(item.coreSlots)
        ? item.coreSlots.filter(
            (slot): slot is "title" | "body" =>
              slot === "title" || slot === "body",
          )
        : (["title", "body"] as const).slice(),
    }));
}

export function getPublishedSite(): PublishedSite {
  return published;
}
