"use client";

import { useState } from "react";
import type { Locale } from "@/i18n/config";
import type { Dictionary } from "@/i18n/dictionaries/zh";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { EditableModuleField } from "@/components/EditableModuleField";
import type { ExtraFieldRef } from "@/lib/extra-fields";

interface ModuleContentExtraFieldsProps {
  locale: Locale;
  dict: Dictionary;
  fields: ExtraFieldRef[];
  labelKey: (fieldId: string) => string;
  valueKey: (fieldId: string) => string;
  onAdd: () => void;
  onRemove: (fieldId: string) => void;
  accentColor?: string;
}

export function ModuleContentExtraFields({
  locale,
  dict,
  fields,
  labelKey,
  valueKey,
  onAdd,
  onRemove,
  accentColor,
}: ModuleContentExtraFieldsProps) {
  const [pendingRemoveId, setPendingRemoveId] = useState<string | null>(null);

  return (
    <div className="mt-4 space-y-2 border-t border-white/10 pt-3">
      {fields.map((field) => (
        <div
          key={field.id}
          className="rounded-lg border border-white/10 bg-white/[0.03] p-3"
        >
          <div className="mb-1 flex items-start gap-1">
            <div className="min-w-0 flex-1">
              <EditableModuleField
                locale={locale}
                fieldKey={labelKey(field.id)}
                defaultText={dict.common.newFieldLabel}
                editHint={dict.home.noteEdit}
                placeholder={dict.common.fieldLabelPlaceholder}
                saveHint={dict.home.noteSaveHint}
                rows={1}
                commitOnEnter
                muted
                textClassName="text-xs"
                accentColor={accentColor}
              />
            </div>
            <button
              type="button"
              onClick={() => setPendingRemoveId(field.id)}
              className="cursor-pointer rounded px-1.5 text-sm text-white/35 transition-colors hover:bg-white/10 hover:text-white/75"
              aria-label={dict.common.removeField}
              title={dict.common.removeField}
            >
              ×
            </button>
          </div>
          <EditableModuleField
            locale={locale}
            fieldKey={valueKey(field.id)}
            defaultText={dict.common.newFieldValue}
            editHint={dict.home.noteEdit}
            placeholder={dict.common.fieldValuePlaceholder}
            saveHint={dict.home.pageSaveHint}
            rows={2}
            accentColor={accentColor}
            muted={false}
          />
        </div>
      ))}
      <button
        type="button"
        onClick={onAdd}
        className="w-full cursor-pointer rounded-lg border border-dashed border-white/20 px-3 py-2 text-left text-xs text-white/45 transition-colors hover:border-white/35 hover:text-white/80"
      >
        <span className="mr-1.5 text-sm text-white/50">+</span>
        {dict.common.addField}
      </button>

      <ConfirmDialog
        open={pendingRemoveId !== null}
        message={dict.common.removeFieldConfirm}
        confirmLabel={dict.common.confirm}
        cancelLabel={dict.common.cancel}
        onConfirm={() => {
          if (pendingRemoveId) onRemove(pendingRemoveId);
          setPendingRemoveId(null);
        }}
        onCancel={() => setPendingRemoveId(null)}
      />
    </div>
  );
}
