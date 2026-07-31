"use client";

import type { Dictionary } from "@/i18n/dictionaries/zh";
import type { ExtraField } from "@/lib/extra-fields";
import { createExtraFieldId } from "@/lib/extra-fields";

type FieldCopy = Pick<
  Dictionary["common"],
  | "addField"
  | "removeField"
  | "newFieldLabel"
  | "newFieldValue"
  | "fieldLabelPlaceholder"
  | "fieldValuePlaceholder"
>;

interface ExtraFieldsEditorProps {
  fields: ExtraField[];
  copy: FieldCopy;
  onChange: (fields: ExtraField[]) => void;
  onRequestRemove: (fieldId: string) => void;
  /** When set, used instead of the internal custom-field add. */
  onAddClick?: () => void;
}

export function ExtraFieldsEditor({
  fields,
  copy,
  onChange,
  onRequestRemove,
  onAddClick,
}: ExtraFieldsEditorProps) {
  function addField() {
    onChange([
      ...fields,
      {
        id: createExtraFieldId(),
        label: copy.newFieldLabel,
        value: copy.newFieldValue,
      },
    ]);
  }

  function patchField(
    fieldId: string,
    patch: Partial<Pick<ExtraField, "label" | "value">>,
  ) {
    onChange(
      fields.map((field) =>
        field.id === fieldId ? { ...field, ...patch } : field,
      ),
    );
  }

  return (
    <div className="space-y-2 border-t border-white/10 pt-3">
      {fields.map((field) => (
        <div
          key={field.id}
          className="rounded-lg border border-white/10 bg-white/[0.03] p-3"
        >
          <div className="mb-2 flex items-center gap-2">
            <input
              value={field.label}
              onChange={(event) =>
                patchField(field.id, { label: event.target.value })
              }
              placeholder={copy.fieldLabelPlaceholder}
              className="min-w-0 flex-1 bg-transparent text-xs text-muted outline-none placeholder:text-muted/40"
            />
            <button
              type="button"
              onClick={() => onRequestRemove(field.id)}
              className="cursor-pointer rounded px-1.5 text-sm text-white/35 transition-colors hover:bg-white/10 hover:text-white/75"
              aria-label={copy.removeField}
              title={copy.removeField}
            >
              ×
            </button>
          </div>
          <textarea
            value={field.value}
            onChange={(event) =>
              patchField(field.id, { value: event.target.value })
            }
            rows={2}
            placeholder={copy.fieldValuePlaceholder}
            className="w-full resize-y bg-transparent text-sm text-foreground outline-none placeholder:text-muted/40"
          />
        </div>
      ))}
      <button
        type="button"
        onClick={onAddClick ?? addField}
        className="w-full cursor-pointer rounded-lg border border-dashed border-white/20 px-3 py-2 text-left text-xs text-white/45 transition-colors hover:border-white/35 hover:text-white/80"
      >
        <span className="mr-1.5 text-sm text-white/50">+</span>
        {copy.addField}
      </button>
    </div>
  );
}

interface ExtraFieldsViewProps {
  fields: ExtraField[];
  copy: Pick<
    Dictionary["common"],
    "fieldLabelPlaceholder" | "fieldValuePlaceholder"
  >;
}

export function ExtraFieldsView({ fields, copy }: ExtraFieldsViewProps) {
  if (fields.length === 0) return null;
  return (
    <div className="mt-3 space-y-2 border-t border-white/10 pt-3">
      {fields.map((field) => (
        <div key={field.id}>
          <p className="mb-0.5 text-xs text-muted">
            {field.label || copy.fieldLabelPlaceholder}
          </p>
          <p className="whitespace-pre-wrap text-sm text-foreground/85">
            {field.value || copy.fieldValuePlaceholder}
          </p>
        </div>
      ))}
    </div>
  );
}
