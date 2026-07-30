"use client";

import { useEffect, useState } from "react";
import { Mail } from "lucide-react";
import type { Locale } from "@/i18n/config";
import type { Dictionary } from "@/i18n/dictionaries/zh";
import { EditableModuleField } from "@/components/EditableModuleField";
import {
  ensureCrossLocaleModuleContent,
  MODULE_CONTENT_EVENT,
  resolveModuleContent,
  type ModuleContentKey,
} from "@/lib/module-content";

const DEFAULTS: { email: string; github: string } = {
  email: "hello@example.com",
  github: "github.com/yourname",
};

function toHref(kind: "email" | "github", value: string) {
  const v = value.trim();
  if (!v) return undefined;
  if (kind === "email") {
    return v.startsWith("mailto:") ? v : `mailto:${v}`;
  }
  if (v.startsWith("http://") || v.startsWith("https://")) return v;
  return `https://${v.replace(/^\/+/, "")}`;
}

interface ContactEditableBodyProps {
  locale: Locale;
  dict: Dictionary;
}

export function ContactEditableBody({ locale, dict }: ContactEditableBodyProps) {
  const [email, setEmail] = useState(DEFAULTS.email);
  const [github, setGithub] = useState(DEFAULTS.github);

  useEffect(() => {
    let cancelled = false;

    async function refresh() {
      await ensureCrossLocaleModuleContent();
      if (cancelled) return;
      setEmail(resolveModuleContent(locale, "contact:email", DEFAULTS.email));
      setGithub(
        resolveModuleContent(locale, "contact:github", DEFAULTS.github),
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
  }, [locale]);

  const cards: {
    key: "email" | "github";
    fieldKey: ModuleContentKey;
    value: string;
  }[] = [
    { key: "email", fieldKey: "contact:email", value: email },
    { key: "github", fieldKey: "contact:github", value: github },
  ];

  return (
    <>
      <EditableModuleField
        locale={locale}
        fieldKey="contact:note"
        defaultText={dict.contact.note}
        editHint={dict.home.noteEdit}
        placeholder={dict.home.pagePlaceholder}
        saveHint={dict.home.pageSaveHint}
        rows={3}
        className="mb-8 max-w-xl"
      />

      <div className="grid gap-4 sm:grid-cols-2">
        {cards.map(({ key, fieldKey, value }) => {
          const href = toHref(key, value);
          return (
            <div
              key={key}
              className="flex items-start gap-4 rounded-xl border border-white/10 bg-white/[0.03] p-5 transition-colors hover:border-white/20"
            >
              <a
                href={href}
                target={key === "github" ? "_blank" : undefined}
                rel={key === "github" ? "noopener noreferrer" : undefined}
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-white/5 transition-colors hover:bg-white/10"
                aria-label={dict.contact[key]}
              >
                <Mail size={18} className="text-accent" />
              </a>
              <div className="min-w-0 flex-1">
                <p className="mb-1 text-xs text-muted">{dict.contact[key]}</p>
                <EditableModuleField
                  locale={locale}
                  fieldKey={fieldKey}
                  defaultText={DEFAULTS[key]}
                  editHint={dict.home.noteEdit}
                  placeholder={dict.home.pagePlaceholder}
                  saveHint={dict.home.pageSaveHint}
                  rows={2}
                  commitOnEnter
                  muted={false}
                />
              </div>
            </div>
          );
        })}
      </div>
    </>
  );
}
