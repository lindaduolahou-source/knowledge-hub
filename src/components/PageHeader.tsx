"use client";

import type { Locale } from "@/i18n/config";
import type { ModuleConfig } from "@/lib/modules";
import { EditableModuleTitle } from "./EditableModuleTitle";

interface PageHeaderProps {
  locale: Locale;
  moduleId: ModuleConfig["id"];
  title: string;
  subtitle: string;
  module?: ModuleConfig;
  editHint: string;
  placeholder: string;
  saveHint: string;
}

export function PageHeader({
  locale,
  moduleId,
  title,
  subtitle,
  module,
  editHint,
  placeholder,
  saveHint,
}: PageHeaderProps) {
  return (
    <div className="mb-10 border-b border-border pb-8">
      {module && (
        <div className="mb-4 flex items-center gap-2 font-mono text-xs">
          <span style={{ color: module.color }}>{module.icon}</span>
          <span style={{ color: module.color }} className="opacity-80">
            {module.id}
          </span>
        </div>
      )}
      <div
        className="mb-3"
        style={module ? { color: module.color } : undefined}
      >
        <EditableModuleTitle
          locale={locale}
          moduleId={moduleId}
          defaultText={title}
          editHint={editHint}
          placeholder={placeholder}
          saveHint={saveHint}
          size="page"
          color={module?.color}
        />
      </div>
      <p className="max-w-2xl text-base leading-relaxed text-muted">
        {subtitle}
      </p>
      {module && (
        <div
          className="mt-4 h-0.5 w-16 rounded-full"
          style={{ backgroundColor: module.color }}
        />
      )}
    </div>
  );
}
