/** Built-in content slots that can be shown/hidden like custom 栏目. */

export function normalizeCoreSlots<T extends string>(
  value: unknown,
  defaults: readonly T[],
): T[] {
  if (!Array.isArray(value)) return [...defaults];
  const allowed = new Set(defaults);
  const next = value.filter(
    (item): item is T => typeof item === "string" && allowed.has(item as T),
  );
  // Legacy records without coreSlots were written as `undefined` → defaults.
  // Empty array means the user explicitly removed every slot.
  if (value.length === 0) return [];
  return next;
}

export function cloneCoreSlots<T extends string>(slots: T[]): T[] {
  return [...slots];
}

/** Prefer restoring a missing built-in slot; otherwise run `addCustom`. */
export function restoreCoreSlotOrAddCustom<T extends string>(
  current: T[],
  all: readonly T[],
  addCustom: () => void,
): T[] | null {
  const missing = all.find((slot) => !current.includes(slot));
  if (missing) return [...current, missing];
  addCustom();
  return null;
}

export function removeCoreSlot<T extends string>(
  current: T[],
  slot: T,
): T[] {
  return current.filter((item) => item !== slot);
}
