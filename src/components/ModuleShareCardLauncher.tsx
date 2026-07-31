"use client";

import { useEffect, useMemo, useState } from "react";
import { ShareCardLauncher } from "@/components/ShareCardLauncher";
import type { Locale } from "@/i18n/config";
import type { Dictionary } from "@/i18n/dictionaries/zh";
import {
  ensureCrossLocaleModuleContent,
  resolveModuleContent,
} from "@/lib/module-content";
import {
  loadModuleSections,
  MODULE_SECTIONS_EVENT,
  sectionBodyKey,
  sectionTitleKey,
  type ModuleSectionDefault,
  type ModuleSectionDef,
} from "@/lib/module-sections";
import type { ShareCardFieldDef } from "@/lib/share-card";

interface ModuleShareCardLauncherProps {
  locale: Locale;
  dict: Dictionary;
  moduleId: string;
  moduleIcon?: string;
  titleDefault: string;
  /** Static fields (intro, contact links, …). Dynamic sections are appended. */
  baseFields: ShareCardFieldDef[];
  sectionDefaults?: ModuleSectionDefault[];
  immersive?: boolean;
  floating?: boolean;
}

export function ModuleShareCardLauncher({
  locale,
  dict,
  moduleId,
  moduleIcon,
  titleDefault,
  baseFields,
  sectionDefaults = [],
  immersive = false,
  floating = false,
}: ModuleShareCardLauncherProps) {
  const defaultLayout = sectionDefaults.map(({ id, variant }) => ({
    id,
    variant,
  }));
  const defaultsById = Object.fromEntries(
    sectionDefaults.map((item) => [item.id, item]),
  ) as Record<string, ModuleSectionDefault>;

  const [sections, setSections] = useState<ModuleSectionDef[]>(defaultLayout);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    function refresh() {
      setSections(loadModuleSections(moduleId, defaultLayout));
      setTick((value) => value + 1);
    }
    refresh();
    void ensureCrossLocaleModuleContent().then(refresh);

    function onSections(event: Event) {
      const detail = (event as CustomEvent<{ moduleId?: string }>).detail;
      if (detail?.moduleId && detail.moduleId !== moduleId) return;
      refresh();
    }

    window.addEventListener(MODULE_SECTIONS_EVENT, onSections);
    window.addEventListener("storage", onSections);
    return () => {
      window.removeEventListener(MODULE_SECTIONS_EVENT, onSections);
      window.removeEventListener("storage", onSections);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [moduleId]);

  const fields = useMemo(() => {
    const baseIds = new Set(baseFields.map((field) => field.id));
    const baseKeys = new Set(
      baseFields
        .map((field) => field.contentKey)
        .filter((key): key is string => Boolean(key)),
    );

    const sectionFields: ShareCardFieldDef[] = [];
    for (const section of sections) {
      const bodyKey = sectionBodyKey(moduleId, section.id);
      if (baseIds.has(section.id) || baseKeys.has(bodyKey)) continue;
      const fallback = defaultsById[section.id];

      sectionFields.push({
        id: section.id,
        contentKey: bodyKey,
        label: resolveModuleContent(
          locale,
          sectionTitleKey(moduleId, section.id),
          fallback?.title ?? dict.home.newSectionTitle,
        ),
        defaultText: resolveModuleContent(
          locale,
          bodyKey,
          fallback?.body ?? dict.home.newSectionBody,
        ),
      });
    }

    return [...baseFields, ...sectionFields];
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [baseFields, sections, moduleId, locale, dict, tick]);

  return (
    <ShareCardLauncher
      locale={locale}
      dict={dict}
      moduleId={moduleId}
      moduleIcon={moduleIcon}
      titleDefault={titleDefault}
      fields={fields}
      immersive={immersive}
      floating={floating}
    />
  );
}
