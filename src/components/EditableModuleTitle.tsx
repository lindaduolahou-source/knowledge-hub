"use client";

import type { Locale } from "@/i18n/config";
import type { ModuleId } from "@/lib/modules";
import { moduleTitleKey } from "@/lib/module-content";
import { EditableModuleField } from "./EditableModuleField";

interface EditableModuleTitleProps {
  locale: Locale;
  moduleId: ModuleId;
  defaultText: string;
  editHint: string;
  placeholder: string;
  saveHint: string;
  /** page = module h1; toc = home/explore list; nav = compact header */
  size?: "page" | "toc" | "nav";
  color?: string;
  className?: string;
  /** When set, clicking the title navigates; edit via separate control. */
  href?: string;
}

const sizeClass: Record<NonNullable<EditableModuleTitleProps["size"]>, string> =
  {
    page: "text-3xl font-medium tracking-tight leading-tight",
    toc: "text-base sm:text-lg font-normal leading-snug text-white",
    nav: "text-[13px] font-normal leading-none",
  };

export function EditableModuleTitle({
  locale,
  moduleId,
  defaultText,
  editHint,
  placeholder,
  saveHint,
  size = "page",
  color,
  className = "",
  href,
}: EditableModuleTitleProps) {
  return (
    <EditableModuleField
      locale={locale}
      fieldKey={moduleTitleKey(moduleId)}
      defaultText={defaultText}
      editHint={editHint}
      placeholder={placeholder}
      saveHint={saveHint}
      rows={1}
      commitOnEnter
      muted={false}
      className={className}
      textClassName={sizeClass[size]}
      accentColor={color}
      inheritColor={size === "page" || size === "toc"}
      href={href}
    />
  );
}
