import type { PublishedSite } from "./published-site";

function readJson<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

/** Collect editable personal data from this browser for publishing into the repo. */
export function collectSiteExport(): PublishedSite {
  return {
    version: 1,
    exportedAt: new Date().toISOString(),
    moduleContent: {
      zh: readJson<Record<string, string>>(
        "knowledge-hub:module-content:zh",
        {},
      ),
      en: readJson<Record<string, string>>(
        "knowledge-hub:module-content:en",
        {},
      ),
    },
    tocNotes: {
      zh: readJson<Record<string, string>>("knowledge-hub:toc-notes:zh", {}),
      en: readJson<Record<string, string>>("knowledge-hub:toc-notes:en", {}),
    },
    moduleLayout: readJson("knowledge-hub:module-layout", null),
    moduleSections: readJson("knowledge-hub:module-sections", null),
  };
}

export function downloadSiteExport(filename = "knowledge-hub-published-site.json") {
  const payload = collectSiteExport();
  const blob = new Blob([JSON.stringify(payload, null, 2)], {
    type: "application/json",
  });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1500);
  return payload;
}
