"use client";

import { useState } from "react";
import { Download } from "lucide-react";
import type { Dictionary } from "@/i18n/dictionaries/zh";
import { downloadSiteExport } from "@/lib/export-site-content";

interface ExportSiteButtonProps {
  dict: Dictionary;
  immersive?: boolean;
}

export function ExportSiteButton({ dict, immersive }: ExportSiteButtonProps) {
  const [done, setDone] = useState(false);

  function handleExport() {
    downloadSiteExport();
    setDone(true);
    window.setTimeout(() => setDone(false), 2500);
  }

  return (
    <button
      type="button"
      onClick={handleExport}
      className={`flex h-8 w-8 cursor-pointer items-center justify-center rounded-full transition-colors duration-200 ${
        immersive
          ? "border border-white/35 text-white hover:bg-white/15"
          : "border border-border text-muted hover:bg-surface hover:text-foreground"
      }`}
      aria-label={dict.publish.export}
      title={done ? dict.publish.exported : dict.publish.exportHint}
    >
      <Download size={15} strokeWidth={1.75} />
    </button>
  );
}
