"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import { Share2, X } from "lucide-react";
import type { Locale } from "@/i18n/config";
import type { Dictionary } from "@/i18n/dictionaries/zh";
import { useModuleLayout } from "@/hooks/useModuleLayout";
import { useModuleTitle } from "@/hooks/useModuleTitle";
import { isBuiltinModuleId, type ModuleConfig } from "@/lib/modules";

interface ShareCardModulePickerProps {
  locale: Locale;
  dict: Dictionary;
  immersive?: boolean;
}

function ModulePickRow({
  locale,
  dict,
  module,
  onPick,
}: {
  locale: Locale;
  dict: Dictionary;
  module: ModuleConfig;
  onPick: (module: ModuleConfig) => void;
}) {
  const defaultTitle = isBuiltinModuleId(module.id)
    ? dict.modules[module.id].title
    : dict.home.newModuleTitle;
  const title = useModuleTitle(locale, module.id, defaultTitle);

  return (
    <li>
      <button
        type="button"
        onClick={() => onPick(module)}
        className="flex w-full cursor-pointer items-center gap-3 rounded-xl border border-white/10 bg-white/[0.03] px-3 py-3 text-left transition-colors hover:border-white/25 hover:bg-white/[0.06]"
      >
        <span className="text-base text-white/55" aria-hidden>
          {module.icon}
        </span>
        <span className="min-w-0 flex-1 truncate text-sm text-white/90">
          {title}
        </span>
      </button>
    </li>
  );
}

export function ShareCardModulePicker({
  locale,
  dict,
  immersive = false,
}: ShareCardModulePickerProps) {
  const router = useRouter();
  const { active, ready } = useModuleLayout();
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  function pickModule(module: ModuleConfig) {
    setOpen(false);
    router.push(`/${locale}/hub/cards?new=${encodeURIComponent(module.id)}`);
  }

  const dialog =
    open && mounted
      ? createPortal(
          <div
            className="fixed inset-0 z-[100] flex items-end justify-center bg-black/70 p-4 sm:items-center"
            role="dialog"
            aria-modal="true"
            aria-label={dict.shareCard.pickModuleTitle}
            onClick={() => setOpen(false)}
          >
            <div
              className="flex max-h-[min(80vh,560px)] w-full max-w-md flex-col overflow-hidden rounded-2xl border border-white/15 bg-[#080b10] shadow-2xl"
              onClick={(event) => event.stopPropagation()}
            >
              <div className="flex shrink-0 items-center justify-between gap-3 border-b border-white/10 px-5 py-4">
                <div>
                  <p className="text-sm font-medium text-white">
                    {dict.shareCard.pickModuleTitle}
                  </p>
                  <p className="mt-1 text-xs text-white/40">
                    {dict.shareCard.pickModuleHint}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="cursor-pointer rounded-full p-1.5 text-white/45 transition-colors hover:bg-white/10 hover:text-white"
                  aria-label={dict.shareCard.close}
                >
                  <X size={16} />
                </button>
              </div>

              <ul className="space-y-2 overflow-y-auto p-4">
                {!ready && (
                  <li className="px-1 py-6 text-center text-xs text-white/35">
                    …
                  </li>
                )}
                {ready &&
                  active.map((module) => (
                    <ModulePickRow
                      key={module.id}
                      locale={locale}
                      dict={dict}
                      module={module}
                      onPick={pickModule}
                    />
                  ))}
                {ready && active.length === 0 && (
                  <li className="px-1 py-6 text-center text-xs text-white/35">
                    {dict.shareCard.pickModuleEmpty}
                  </li>
                )}
              </ul>
            </div>
          </div>,
          document.body,
        )
      : null;

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={
          immersive
            ? "inline-flex cursor-pointer items-center gap-1.5 rounded-full border border-white/35 px-3 py-1.5 text-xs text-white transition-colors hover:bg-white/15"
            : "inline-flex cursor-pointer items-center gap-1.5 rounded-full border border-border px-3 py-1.5 text-xs text-muted transition-colors hover:border-accent/40 hover:bg-surface hover:text-foreground"
        }
        title={dict.shareCard.open}
      >
        <Share2 size={13} strokeWidth={1.75} />
        {dict.shareCard.open}
      </button>
      {dialog}
    </>
  );
}
