"use client";

import type { Locale } from "@/i18n/config";
import {
  ensureCrossLocaleModuleContent,
  MODULE_CONTENT_EVENT,
  resolveModuleContent,
  saveModuleContent,
  type ModuleContentKey,
} from "@/lib/module-content";
import { EditableLocalText } from "./EditableLocalText";

interface EditableModuleFieldProps {
  locale: Locale;
  fieldKey: ModuleContentKey;
  defaultText: string;
  editHint: string;
  placeholder: string;
  saveHint: string;
  rows?: number;
  commitOnEnter?: boolean;
  variant?: "plain" | "list" | "chips";
  accentColor?: string;
  className?: string;
  textClassName?: string;
  muted?: boolean;
  inheritColor?: boolean;
  href?: string;
}

export function EditableModuleField(props: EditableModuleFieldProps) {
  return (
    <EditableLocalText
      {...props}
      resolve={resolveModuleContent}
      save={saveModuleContent}
      ensureSync={ensureCrossLocaleModuleContent}
      eventName={MODULE_CONTENT_EVENT}
    />
  );
}
