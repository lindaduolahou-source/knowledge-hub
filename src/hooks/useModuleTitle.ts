"use client";

import { useEffect, useState } from "react";
import type { Locale } from "@/i18n/config";
import type { ModuleId } from "@/lib/modules";
import {
  ensureCrossLocaleModuleContent,
  MODULE_CONTENT_EVENT,
  moduleTitleKey,
  resolveModuleContent,
} from "@/lib/module-content";

/** Read-only live module title (for nav links). */
export function useModuleTitle(
  locale: Locale,
  moduleId: ModuleId,
  defaultTitle: string,
) {
  const [title, setTitle] = useState(defaultTitle);

  useEffect(() => {
    let cancelled = false;

    async function refresh() {
      await ensureCrossLocaleModuleContent();
      if (cancelled) return;
      setTitle(
        resolveModuleContent(locale, moduleTitleKey(moduleId), defaultTitle),
      );
    }

    void refresh();

    function onUpdate(event: Event) {
      const detail = (event as CustomEvent<{ locale?: Locale }>).detail;
      if (detail?.locale && detail.locale !== locale) return;
      void refresh();
    }

    window.addEventListener(MODULE_CONTENT_EVENT, onUpdate);
    window.addEventListener("storage", onUpdate);
    return () => {
      cancelled = true;
      window.removeEventListener(MODULE_CONTENT_EVENT, onUpdate);
      window.removeEventListener("storage", onUpdate);
    };
  }, [locale, moduleId, defaultTitle]);

  return title;
}
